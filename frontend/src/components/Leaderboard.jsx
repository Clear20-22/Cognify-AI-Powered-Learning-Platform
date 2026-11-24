import { TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";

/** FR-RT-05: render the server's authoritative rank and score. */
export default function Leaderboard({ entries = [], currentUserId, participantCount = entries.length, finished = false }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-label="Live leaderboard">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-amber-50 p-2 text-amber-600"><TrophyIcon className="h-5 w-5" /></span>
          <div><h2 className="font-bold text-gray-900">{finished ? "Final standings" : "Live leaderboard"}</h2><p className="text-xs text-gray-500">{finished ? "Every answer counts. Well done!" : "Scores update as answers arrive"}</p></div>
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500"><UserGroupIcon className="h-4 w-4" />{participantCount}</span>
      </div>
      {entries.length ? (
        <ol className="divide-y divide-gray-100" aria-live="polite" aria-relevant="additions text">
          {entries.map((entry, index) => {
            const isYou = String(entry.user_id) === String(currentUserId);
            return (
              <li key={entry.user_id} className={`flex items-center gap-3 px-5 py-4 ${isYou ? "bg-red-50/60" : ""}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{entry.rank || index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-800">{entry.name || "Student"}{isYou && <span className="ml-2 text-xs font-normal text-red-600">You</span>}</p><p className="text-xs text-gray-500">{entry.answered_count || 0} answered</p></div>
                <span className="text-right text-sm font-bold text-gray-900">{entry.score || 0}<span className="ml-1 text-xs font-normal text-gray-500">pts</span></span>
              </li>
            );
          })}
        </ol>
      ) : <div className="px-6 py-10 text-center text-sm text-gray-500"><UserGroupIcon className="mx-auto mb-3 h-8 w-8 text-gray-300" />Students will appear here when they join.</div>}
    </section>
  );
}
