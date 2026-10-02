# StayFinder submission checklist

Status: preparation template. Target: G1-G16 and VG1-VG7.
Do not claim a criterion as fulfilled until its complete behavior is verified.

## Repository links

The current origin is https://github.com/lilyweathers/stayfinder-stays.
Both apps live in the same repository:

- Backend: https://github.com/lilyweathers/stayfinder-stays/tree/main/backend
- Frontend: https://github.com/lilyweathers/stayfinder-stays/tree/main/frontend

Confirm the final branch and teacher access before submitting. These links do
not prove that local changes have been committed or pushed. No publication was
performed during preparation.

## Required deliverables

- [ ] Commit and push the final backend, frontend, documentation, SQL, and requests.
- [ ] Confirm the teacher can open the repository and the correct branch.
- [ ] List fulfilled criteria in [criteria.md](criteria.md), with evidence.
- [ ] Complete [stayfinder.http](../requests/stayfinder.http) and its remaining cases.
- [ ] Show successful and rejected API calls for all chosen VG criteria.
- [ ] Verify database enforcement directly, not only via the Hono API.
- [ ] Keep setup instructions accurate, with environment examples and SQL setup.
- [ ] Ensure submitted files contain no passwords, tokens, or real environment keys.

## Final verification record

Fill in after implementation; leave blank rather than infer success.

| Check | Result / date / evidence |
| --- | --- |
| Backend typecheck | Pending final run |
| Backend tests | Pending final run |
| Backend build | Pending final run |
| Frontend lint | Pending final run |
| Frontend typecheck | Pending final run |
| Frontend build | Pending final run |
| Browser flows | Pending |
| API requests, success and rejection | Pending |
| Direct database permissions and booking constraints | Pending |
| Final submitted commit | Pending |

From each app's folder, run the checks documented in its README. Record results
from the actual final version. Preparation checks do not establish completion.

## Oral review: approximately 8-10 minutes

Rehearse a short flow: public property browsing/filtering, login, property creation,
booking preview/submission, booking management, and an understandable rejected
operation. Use prepared development accounts and fixtures.

Then practise explaining the code and database rules for each criterion:

- Authentication identifies the user; authorization decides permitted actions.
- Cookie handling maintains the session between the frontend and API.
- API checks provide validation/errors; database policies and constraints protect
  direct calls and enforce data integrity.
- Ownership comes from verified identity rather than client-submitted user IDs.
- Overlap enforcement must remain correct for simultaneous booking attempts.
- Saved totals must use trusted server/database prices.

Be able to locate the implementation and tests, explain why each rule lives where
it does, and describe a successful, rejected, and boundary case in your own words.
