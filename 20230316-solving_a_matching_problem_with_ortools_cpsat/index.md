# Solving a matching problem with OR-Tools CP-SAT

Optimizing matching for preference satisfaction often focuses on
[stability][], which prioritizes individual interests. When maximizing
resource utilization is more important, [Constraint Programming][]
(CP) can be used to find good matches. Google's [OR-Tools][] package
includes the [CP-SAT][] solver, which is one way to implement this.

[stability]: https://en.wikipedia.org/wiki/Stable_marriage_problem "Wikipedia: Stable marriage problem"
[Constraint Programming]: https://en.wikipedia.org/wiki/Constraint_programming "Wikipedia: Constraint programming"
[OR-Tools]: https://developers.google.com/optimization "OR-Tools | Google Developers"
[CP-SAT]: https://developers.google.com/optimization/cp/cp_solver "CP-SAT Solver | OR-Tools | Google Developers"


For example, we may be assigning a pool of interns to specific roles.
Managers for each role have ranked some of the candidates, and a
candidate can only be matched to a role for which they have been
ranked. Roles often have one spot to be filled, but some have more.
Candidates have been ranked for multiple roles, but can only be
assigned one.


This problem is similar to the [medical residency matching][] problem,
which famously applies the Nobel-prize-winning
[Gale–Shapley algorithm][]. One difference is that the present example
only has preferences from one side. Sometimes random preferences are
created in order to still allow the application of algorithms like
Gale–Shapley, but this will not be necessary here because there is a
bigger issue.

[medical residency matching]: https://en.wikipedia.org/wiki/National_Resident_Matching_Program "Wikipedia: National Resident Matching Program"
[Gale–Shapley algorithm]: https://en.wikipedia.org/wiki/Gale%E2%80%93Shapley_algorithm "Wikipedia: Gale–Shapley algorithm"


The salient difference between what Gale–Shapley does and the goal of
the example here is that we really want to fill every available role,
even if it means the match isn't perfectly stable. Gale–Shapley will
create a match that leaves some roles unfilled if this is necessary to
ensure that no trade would better satisfy the preferences of the
individuals involved. In general, Gale–Shapley will leave some roles
unfilled.


To begin a solution with the OR-Tools (OR for [Operations Research][])
package, we start by converting the rankings to scores, where 1 is the
best and 0 is the worst: [`rankings.csv`](rankings.csv) (There are
different ways of doing this, like percentiles; here we assume we have
scores.)

[Operations Research]: https://en.wikipedia.org/wiki/Operations_research "Wikipedia: Operations research"


```
role,person,score
Role 23,Person 11,0.5238095238095238
Role 23,Person 109,0.7619047619047619
Role 23,Person 111,0.6190476190476191
...
```


Each role has some maximum number of spots to fill: [`spots.csv`](spots.csv)


```
Role 23,4
Role 31,1
Role 8,1
...
```


We can start reading in data using Python.

```python
import csv

spots = {role: int(n) for role, n in csv.reader(open('spots.csv'))}
all_rankings = [ranking for ranking in csv.DictReader(open('rankings.csv'))]
```


It will be convenient to have quick access to all the people ranked
for a role, and all the roles a person is ranked for.

```python
by_role, by_person = {}, {}

for ranking in all_rankings:
    by_role.setdefault(ranking['role'], []).append(ranking)
    by_person.setdefault(ranking['person'], []).append(ranking)
```


Now we can start using OR-Tools.

```python
from ortools.sat.python import cp_model

model = cp_model.CpModel()
solver = cp_model.CpSolver()
```


The matching will be represented via a Boolean variable for each
ranking that is true to select that match and false otherwise.

```python
for ranking in all_rankings:
    ranking['selected'] = model.NewBoolVar('')
```


OR-Tools lets us use natural Python expressions to express
constraints. First, we dictate that each role should have no more than
the allowed number of people.

```python
for role, rankings in by_role.items():
    total = sum(ranking['selected'] for ranking in rankings)
    model.Add(total <= spots[role])
```


Similarly, we require that each person is matched with at most one
role.

```python
for person, rankings in by_person.items():
    total = sum(ranking['selected'] for ranking in rankings)
    model.Add(total <= 1)
```


The objective will be to maximize the total score of selected matches.

```python
total_score = 0
for ranking in all_rankings:
    score = float(ranking['score']) * ranking['selected']
    total_score += score
```


At this point, we need only ask for the solution.

```python
model.Maximize(total_score)
status = solver.Solve(model)
print(solver.Value(total_score), solver.StatusName(status))
# 82.87644300144302 OPTIMAL
```


You can check that every role has its maximal number of people, and
every person has one role (or zero; this example has more people than
spots). The CP-SAT solver has done the heavy lifting of finding a
solution and even guaranteeing that it is optimal.


```python
with open('results.csv', 'w') as f:
    writer = csv.DictWriter(f, all_rankings[0].keys())
    writer.writeheader()
    for ranking in all_rankings:
        ranking['selected'] = solver.Value(ranking['selected'])
        writer.writerow(ranking)
```


Code is also available in a [notebook][]. Writing out results
produces: [`results.csv`](results.csv)

[notebook]: https://github.com/ajschumacher/ajschumacher.github.io/blob/master/20230316-solving_a_matching_problem_with_ortools_cpsat/matching.ipynb


```
role,person,score,selected
Role 23,Person 11,0.5238095238095238,0
...
Role 23,Person 41,0.5714285714285714,1
...
```


The approach here is general enough that with modifications it can be
applied to a wide range of more or less related problems. There is
always a question of whether the chosen metric is the right one to
optimize, but making some choice can get you pretty far toward a good
solution, with a solver that makes optimization easy. Indeed, what
other problems might be formulated in a manner amenable to solving in
this way? OR-Tools are handy!


---

Thanks to Maxime Labonne, whose Linear Programming [course][] was very
helpful as I started to use OR-Tools.

[course]: https://github.com/mlabonne/Linear-Programming-Course "Hands-on course about linear programming and mathematical optimization."
