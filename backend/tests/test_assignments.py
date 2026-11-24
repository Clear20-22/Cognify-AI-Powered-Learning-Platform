"""
Tests for the assignment module: FR-ASG-01..08, ownership rules and file validation (NFR-SEC-05).
"""

from datetime import datetime, timedelta, timezone
import pytest
from app.core.config import get_settings

PASSWORD = "SecurePass123"
PDF = b"%PDF-1.4 test document"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def future(days=7):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def make_user(client, email, role="student"):
    response = client.post("/api/auth/signup", json={
        "email": email, "password": PASSWORD, "fullName": email.split("@")[0], "role": role
    })
    assert response.status_code == 200, response.text
    data = response.json()
    return data["user_id"], {"Authorization": f"Bearer {data['access_token']}"}


def create_assignment(client, headers, files=None, **fields):
    form = {"title": "Essay 1", "deadline": future(), "max_marks": "10", **fields}
    return client.post("/api/assignments", data=form, files=files or [], headers=headers)


def submit(client, headers, assignment_id, text="My answer", file=None):
    files = {"file": file} if file else None
    return client.post(f"/api/assignments/{assignment_id}/submission",
                       data={"text": text}, files=files, headers=headers)


def expire_deadline(client, assignment_id):
    """Move an assignment's deadline into the past (the API only accepts future deadlines)."""
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    client.app.state.data_store.assignments[assignment_id]["deadline"] = past


@pytest.fixture
def setup(test_client, monkeypatch):
    monkeypatch.setattr(get_settings(), "ADMIN_EMAILS", "admin@test.com")
    _, teacher = make_user(test_client, "teacher@test.com", "teacher")
    _, other_teacher = make_user(test_client, "teacher2@test.com", "teacher")
    student_id, student = make_user(test_client, "student@test.com")
    _, student2 = make_user(test_client, "student2@test.com")
    _, admin = make_user(test_client, "admin@test.com")
    response = create_assignment(test_client, teacher, title="Essay 1", description="Write 500 words",
                                 files=[("files", ("brief.pdf", PDF, "application/pdf"))])
    assert response.status_code == 201, response.text
    return {
        "client": test_client, "teacher": teacher, "other_teacher": other_teacher,
        "student": student, "student_id": student_id, "student2": student2, "admin": admin,
        "assignment": response.json(),
    }


# ---------------------------------------------------------------------------
# FR-ASG-01: create
# ---------------------------------------------------------------------------

def test_teacher_creates_assignment_with_file(setup):
    a = setup["assignment"]
    assert a["title"] == "Essay 1"
    assert a["description"] == "Write 500 words"
    assert a["max_marks"] == 10
    assert a["allow_late"] is False
    assert a["is_past_deadline"] is False
    assert [f["filename"] for f in a["attachments"]] == ["brief.pdf"]
    assert a["attachments"][0]["content_type"] == "application/pdf"


def test_only_teachers_and_admins_create(setup):
    c = setup["client"]
    assert create_assignment(c, setup["student"]).status_code == 403
    assert create_assignment(c, {}).status_code == 401
    assert create_assignment(c, setup["admin"]).status_code == 201


@pytest.mark.parametrize("fields", [
    {"deadline": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
    {"max_marks": "0"},
    {"max_marks": "1001"},
    {"title": "   "},
    {"deadline": "not-a-date"},
])
def test_invalid_assignment_fields_rejected(setup, fields):
    assert create_assignment(setup["client"], setup["teacher"], **fields).status_code == 422


@pytest.mark.parametrize("file,message", [
    (("virus.exe", b"MZ\x90\x00", "application/octet-stream"), "not allowed"),
    (("fake.pdf", b"MZ\x90\x00 not a pdf", "application/pdf"), "does not match"),
    (("empty.pdf", b"", "application/pdf"), "empty"),
    (("big.pdf", b"%PDF" + b"0" * (20 * 1024 * 1024), "application/pdf"), "too large"),
])
def test_bad_files_rejected(setup, file, message):
    response = create_assignment(setup["client"], setup["teacher"], files=[("files", file)])
    assert response.status_code == 400
    assert message in response.json()["detail"]


def test_too_many_attachments_rejected(setup):
    files = [("files", (f"f{i}.pdf", PDF, "application/pdf")) for i in range(6)]
    assert create_assignment(setup["client"], setup["teacher"], files=files).status_code == 400


# ---------------------------------------------------------------------------
# Ownership: teachers manage only their own assignments
# ---------------------------------------------------------------------------

def test_teachers_see_and_manage_only_their_own(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    other = setup["other_teacher"]

    assert c.get("/api/assignments", headers=other).json()["total"] == 0
    assert c.get(f"/api/assignments/{aid}", headers=other).status_code == 403
    assert c.patch(f"/api/assignments/{aid}", json={"title": "x"}, headers=other).status_code == 403
    assert c.delete(f"/api/assignments/{aid}", headers=other).status_code == 403
    assert c.get(f"/api/assignments/{aid}/submissions", headers=other).status_code == 403

    # Admin can manage every assignment
    assert c.get("/api/assignments", headers=setup["admin"]).json()["total"] == 1
    assert c.get(f"/api/assignments/{aid}/submissions", headers=setup["admin"]).status_code == 200


# ---------------------------------------------------------------------------
# FR-ASG-02 / 03: students see assignments with status and submit
# ---------------------------------------------------------------------------

def test_student_sees_pending_then_submitted(setup):
    c, aid, student = setup["client"], setup["assignment"]["id"], setup["student"]

    listed = c.get("/api/assignments", headers=student).json()["assignments"]
    assert [(a["id"], a["my_status"]) for a in listed] == [(aid, "pending")]
    assert listed[0]["submission_count"] is None  # teacher-only counts are not exposed

    response = submit(c, student, aid, text="  Final answer  ")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "submitted"
    assert response.json()["text"] == "Final answer"

    listed = c.get("/api/assignments", headers=student).json()["assignments"]
    assert listed[0]["my_status"] == "submitted"
    assert listed[0]["my_marks"] is None


def test_submission_needs_text_or_file_and_only_students_submit(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    assert submit(c, setup["student"], aid, text="   ").status_code == 400
    assert submit(c, setup["teacher"], aid).status_code == 403
    assert submit(c, setup["student"], "asg_missing").status_code == 404


def test_submit_file_and_download_permissions(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    response = submit(c, setup["student"], aid, text="", file=("answer.png", PNG, "image/png"))
    assert response.status_code == 200, response.text
    sub = response.json()
    assert sub["file"]["filename"] == "answer.png"

    url = f"/api/assignments/{aid}/submissions/{sub['id']}/file"
    assert c.get(url, headers=setup["teacher"]).content == PNG
    assert c.get(url, headers=setup["student"]).status_code == 200
    assert c.get(url, headers=setup["student2"]).status_code == 403
    assert c.get(url, headers=setup["other_teacher"]).status_code == 403


def test_student_downloads_teacher_attachment(setup):
    c, a = setup["client"], setup["assignment"]
    file_id = a["attachments"][0]["file_id"]
    response = c.get(f"/api/assignments/{a['id']}/attachments/{file_id}", headers=setup["student"])
    assert response.status_code == 200
    assert response.content == PDF
    assert "brief.pdf" in response.headers["content-disposition"]
    assert c.get(f"/api/assignments/{a['id']}/attachments/file_other", headers=setup["student"]).status_code == 404


# ---------------------------------------------------------------------------
# FR-ASG-04 / 05: deadlines and resubmission
# ---------------------------------------------------------------------------

def test_resubmission_replaces_previous(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    store = c.app.state.data_store
    first = submit(c, setup["student"], aid, text="v1", file=("a.pdf", PDF, "application/pdf")).json()
    old_file_id = first["file"]["file_id"]

    second = submit(c, setup["student"], aid, text="v2").json()
    assert second["id"] == first["id"]
    assert second["text"] == "v2"
    assert second["file"] is None
    assert second["resubmission_count"] == 1
    assert second["submitted_at"] >= first["submitted_at"]
    assert old_file_id not in store.files  # replaced file is removed

    subs = c.get(f"/api/assignments/{aid}/submissions", headers=setup["teacher"]).json()
    assert subs["total"] == 1


def test_late_submission_rejected_unless_allowed(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    expire_deadline(c, aid)
    response = submit(c, setup["student"], aid)
    assert response.status_code == 400
    assert "deadline has passed" in response.json()["detail"]

    # Teacher enables late submissions (deadline itself stays in the past)
    c.patch(f"/api/assignments/{aid}", json={"allow_late": True}, headers=setup["teacher"])
    response = submit(c, setup["student"], aid)
    assert response.status_code == 200
    assert response.json()["is_late"] is True


# ---------------------------------------------------------------------------
# FR-ASG-06 / 07 / 08: grading
# ---------------------------------------------------------------------------

def test_grading_flow(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    sub_id = submit(c, setup["student"], aid).json()["id"]
    url = f"/api/assignments/{aid}/submissions/{sub_id}/grade"

    too_high = c.patch(url, json={"marks": 11}, headers=setup["teacher"])
    assert too_high.status_code == 400
    assert "cannot exceed" in too_high.json()["detail"]
    assert c.patch(url, json={"marks": -1}, headers=setup["teacher"]).status_code == 422
    assert c.patch(url, json={"marks": 5}, headers=setup["student"]).status_code == 403
    assert c.patch(url, json={"marks": 5}, headers=setup["other_teacher"]).status_code == 403

    graded = c.patch(url, json={"marks": 8.5, "feedback": "Good work"}, headers=setup["teacher"])
    assert graded.status_code == 200
    assert graded.json()["status"] == "graded"

    mine = c.get(f"/api/assignments/{aid}/submission", headers=setup["student"]).json()
    assert (mine["marks"], mine["feedback"], mine["status"]) == (8.5, "Good work", "graded")
    listed = c.get("/api/assignments", headers=setup["student"]).json()["assignments"][0]
    assert (listed["my_status"], listed["my_marks"]) == ("graded", 8.5)

    # A graded submission is final
    assert submit(c, setup["student"], aid, text="changed").status_code == 400


def test_marks_hidden_until_graded_and_teacher_counts(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    sub1 = submit(c, setup["student"], aid).json()["id"]
    submit(c, setup["student2"], aid)
    c.patch(f"/api/assignments/{aid}/submissions/{sub1}/grade", json={"marks": 7}, headers=setup["teacher"])

    a = c.get("/api/assignments", headers=setup["teacher"]).json()["assignments"][0]
    assert (a["submission_count"], a["graded_count"], a["awaiting_review"]) == (2, 1, 1)

    other_student = c.get("/api/assignments", headers=setup["student2"]).json()["assignments"][0]
    assert other_student["my_status"] == "submitted"
    assert other_student["my_marks"] is None


def test_own_submission_is_null_before_submitting(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    response = c.get(f"/api/assignments/{aid}/submission", headers=setup["student"])
    assert response.status_code == 200
    assert response.json() is None


# ---------------------------------------------------------------------------
# Editing and deleting
# ---------------------------------------------------------------------------

def test_update_rules(setup):
    c, aid, teacher = setup["client"], setup["assignment"]["id"], setup["teacher"]
    sub_id = submit(c, setup["student"], aid).json()["id"]
    c.patch(f"/api/assignments/{aid}/submissions/{sub_id}/grade", json={"marks": 9}, headers=teacher)

    lowered = c.patch(f"/api/assignments/{aid}", json={"max_marks": 5}, headers=teacher)
    assert lowered.status_code == 400
    assert c.patch(f"/api/assignments/{aid}", json={"deadline": "2000-01-01T00:00:00Z"}, headers=teacher).status_code == 422
    assert c.patch(f"/api/assignments/{aid}", json={}, headers=teacher).status_code == 400

    updated = c.patch(f"/api/assignments/{aid}", json={"title": "Essay 1 (revised)", "max_marks": 20}, headers=teacher)
    assert updated.status_code == 200
    assert (updated.json()["title"], updated.json()["max_marks"]) == ("Essay 1 (revised)", 20)


def test_delete_removes_submissions_and_files(setup):
    c, aid = setup["client"], setup["assignment"]["id"]
    store = c.app.state.data_store
    submit(c, setup["student"], aid, file=("a.pdf", PDF, "application/pdf"))
    assert len(store.files) == 2  # teacher attachment + student file

    assert c.delete(f"/api/assignments/{aid}", headers=setup["teacher"]).status_code == 204
    assert c.get(f"/api/assignments/{aid}", headers=setup["teacher"]).status_code == 404
    assert store.files == {}
    assert store.submissions == {}
