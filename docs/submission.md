# StayFinder submission checklist

Final audit: 2026-10-12. G1–G16 and VG1–VG7 fulfilled. The user completed the
presentation and reported passing. See [criteria](criteria.md) and
[detailed evidence](criteria-evidence.md).

## Repository and teacher access

Submit [stayfinder-stays, main](https://github.com/lilyweathers/stayfinder-stays/tree/main).
The repository was made public at the user's request. GitHub reports PUBLIC and
default branch main; an unauthenticated request to the branch URL returned HTTP
200 on 2026-10-12. The teacher needs no collaborator invitation to read it.

## Required deliverables

- [ ] Commit and push the final backend, frontend, documentation, SQL, and requests.
- [x] Confirm the teacher can open the repository and the correct branch.
- [x] List fulfilled criteria in [criteria.md](criteria.md), with evidence.
- [x] Complete [stayfinder.http](../requests/stayfinder.http) and its remaining cases.
- [x] Show successful and rejected API calls for all chosen VG criteria.
- [x] Verify database enforcement directly, not only via the Hono API.
- [x] Keep setup instructions accurate, with environment examples and SQL setup.
- [x] Ensure submitted files contain no passwords, tokens, or real environment keys.

The credential item refers to real credentials: examples contain placeholders
and automated mocked tests contain intentionally fake passwords/tokens.

## Final verification record

| Check | Result / evidence (2026-10-12) |
| --- | --- |
| Backend typecheck | PASS |
| Backend tests | PASS, 66/66; fixed three expired generic fixture dates |
| Backend build | PASS |
| Frontend lint | PASS |
| Frontend typecheck | PASS, including generated route types |
| Frontend build | PASS |
| Browser flows | Previously user-confirmed; presentation completed and passed, user report |
| API success/rejection | PASS, all seven VG live runners; 304 checks in total |
| Direct database enforcement | PASS, live direct Supabase writes/RPCs and concurrent overlap checks; earlier SQL tests separately user-confirmed |
| Setup | Current READMEs and environment examples; fresh-project base SQL provided, full fresh-project rehearsal not performed |
| Credentials | No real-secret findings in 188 submission files or 476 reachable historical blobs; compared against local credentials without printing them |
| Repository access | PUBLIC, default main; unauthenticated branch URL HTTP 200 |
| Final submitted commit | Pending final commit and push |

All live runners reported cleanup complete. Expected statuses in the manual HTTP
file are assertions; freshly observed runner results are in criteria-evidence.md.
Local .env files, test-account credentials and cookie jars remain ignored.

## Oral review

- [x] Rehearse the app demonstration and explanations for the 8–10 minute review.
- [x] Complete presentation (user reported passing on 2026-10-12).
