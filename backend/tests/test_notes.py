"""
Tests for notes: owner-only access, topic/course association, filtering and keyword search.
Covers FR-NOTE-01, FR-NOTE-02, FR-NOTE-03 and FR-NOTE-04.
"""

import pytest

PASSWORD = "SecurePass123"


def make_user(client, email):
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": PASSWORD, "fullName": "Note Tester"}
    )
    assert response.status_code == 200
    data = response.json()
    return data["user_id"], {"Authorization": f"Bearer {data['access_token']}"}


def create_note(client, headers, **fields):
    body = {"content": "Some content", **fields}
    response = client.post("/api/notes", json=body, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def list_notes(client, user_id, headers, **params):
    response = client.get(f"/api/notes/users/{user_id}/notes", params=params, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()["notes"]


# ---------------------------------------------------------------------------
# FR-NOTE-04: notes are visible only to their owner
# ---------------------------------------------------------------------------

def test_notes_require_authentication(test_client):
    assert test_client.post("/api/notes", json={"content": "x"}).status_code == 401
    assert test_client.get("/api/notes/users/anyone/notes").status_code == 401
    assert test_client.get("/api/notes/note_x").status_code == 401
    assert test_client.patch("/api/notes/note_x", json={"content": "y"}).status_code == 401
    assert test_client.delete("/api/notes/note_x").status_code == 401


def test_owner_comes_from_token_not_body(test_client):
    alice_id, alice = make_user(test_client, "alice@test.com")
    bob_id, _ = make_user(test_client, "bob@test.com")
    note = create_note(test_client, alice, user_id=bob_id)
    assert note["user_id"] == alice_id


def test_other_users_cannot_read_change_or_delete(test_client):
    alice_id, alice = make_user(test_client, "alice@test.com")
    _, bob = make_user(test_client, "bob@test.com")
    note_id = create_note(test_client, alice, content="private")["id"]

    assert test_client.get(f"/api/notes/{note_id}", headers=bob).status_code == 403
    assert test_client.patch(f"/api/notes/{note_id}", json={"content": "hacked"}, headers=bob).status_code == 403
    assert test_client.delete(f"/api/notes/{note_id}", headers=bob).status_code == 403
    assert test_client.get(f"/api/notes/users/{alice_id}/notes", headers=bob).status_code == 403

    # Still intact for the owner
    response = test_client.get(f"/api/notes/{note_id}", headers=alice)
    assert response.status_code == 200
    assert response.json()["content"] == "private"


def test_owner_full_crud(test_client):
    user_id, headers = make_user(test_client, "crud@test.com")
    note_id = create_note(test_client, headers, content="first", title="T")["id"]

    updated = test_client.patch(f"/api/notes/{note_id}", json={"content": "second"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["content"] == "second"

    assert test_client.delete(f"/api/notes/{note_id}", headers=headers).status_code == 204
    assert test_client.get(f"/api/notes/{note_id}", headers=headers).status_code == 404
    assert list_notes(test_client, user_id, headers) == []


# ---------------------------------------------------------------------------
# FR-NOTE-02: topic / course association and filtering
# ---------------------------------------------------------------------------

def test_topic_and_course_are_saved_and_cleaned(test_client):
    _, headers = make_user(test_client, "topic@test.com")
    note = create_note(test_client, headers, topic="  Machine Learning  ", course_id="course_1",
                       tags=[" ai ", "AI", "", "ml"])
    assert note["topic"] == "Machine Learning"
    assert note["course_id"] == "course_1"
    assert note["tags"] == ["ai", "ml"]


def test_filter_by_topic_course_and_tag(test_client):
    user_id, headers = make_user(test_client, "filter@test.com")
    create_note(test_client, headers, content="a", topic="Algebra", course_id="math101", tags=["exam"])
    create_note(test_client, headers, content="b", topic="Biology", course_id="bio101")
    create_note(test_client, headers, content="c", topic="algebra", tags=["Exam", "hard"])

    by_topic = list_notes(test_client, user_id, headers, topic="ALGEBRA")
    assert sorted(n["content"] for n in by_topic) == ["a", "c"]

    by_course = list_notes(test_client, user_id, headers, course_id="bio101")
    assert [n["content"] for n in by_course] == ["b"]

    by_tag = list_notes(test_client, user_id, headers, tag="exam")
    assert sorted(n["content"] for n in by_tag) == ["a", "c"]

    combined = list_notes(test_client, user_id, headers, topic="algebra", tag="hard")
    assert [n["content"] for n in combined] == ["c"]


def test_clear_topic_with_empty_string(test_client):
    _, headers = make_user(test_client, "clear@test.com")
    note_id = create_note(test_client, headers, topic="Physics")["id"]
    response = test_client.patch(f"/api/notes/{note_id}", json={"topic": ""}, headers=headers)
    assert response.status_code == 200
    assert response.json()["topic"] is None


# ---------------------------------------------------------------------------
# FR-NOTE-03: keyword search
# ---------------------------------------------------------------------------

def test_keyword_search_matches_title_content_tags_and_topic(test_client):
    user_id, headers = make_user(test_client, "search@test.com")
    create_note(test_client, headers, content="Photosynthesis uses light", title="Plants")
    create_note(test_client, headers, content="Newton laws", title="Forces", tags=["physics"])
    create_note(test_client, headers, content="Cells divide", topic="Physiology")
    create_note(test_client, headers, content="Untitled note about atoms")  # no title, no topic

    def search(q):
        return sorted(n["content"] for n in list_notes(test_client, user_id, headers, q=q))

    assert search("PLANTS") == ["Photosynthesis uses light"]           # title, case-insensitive
    assert search("newton") == ["Newton laws"]                         # content
    assert search("physi") == ["Cells divide", "Newton laws"]          # tag + topic
    assert search("atoms") == ["Untitled note about atoms"]            # note without title is fine
    assert search("quantum") == []


def test_search_only_returns_own_notes(test_client):
    alice_id, alice = make_user(test_client, "alice@test.com")
    _, bob = make_user(test_client, "bob@test.com")
    create_note(test_client, bob, content="shared keyword")
    assert list_notes(test_client, alice_id, alice, q="shared") == []


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("body", [
    {"content": ""},
    {"content": "x", "tags": [f"t{i}" for i in range(21)]},
    {"content": "x", "tags": ["t" * 51]},
    {"content": "x", "topic": "t" * 101},
])
def test_invalid_notes_rejected(test_client, body):
    _, headers = make_user(test_client, "invalid@test.com")
    assert test_client.post("/api/notes", json=body, headers=headers).status_code == 422


def test_empty_update_rejected(test_client):
    _, headers = make_user(test_client, "empty@test.com")
    note_id = create_note(test_client, headers)["id"]
    assert test_client.patch(f"/api/notes/{note_id}", json={}, headers=headers).status_code == 400
