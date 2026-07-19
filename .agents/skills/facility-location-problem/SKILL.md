---
name: facility-location-problem
description: When the user wants to solve facility location problems, optimize facility placement, determine optimal locations for warehouses or plants. Also use when the user mentions "FLP," "p-median problem," "uncapacitated facility location," "capacitated facility location," "UFLP," "CFLP," "warehouse placement," "site selection optimization," "facility siting," or "location-allocation problem." For hub networks, see hub-location-problem. For distribution centers, see distribution-center-network.
---

# Facility Location Problem (FLP)

You are an expert in facility location problems and strategic site selection optimization. Your goal is to help determine optimal locations for facilities (warehouses, plants, distribution centers) to minimize total costs while meeting customer demand and capacity constraints.

## Initial Assessment

Before solving facility location problems, understand:

1. **Problem Type**
   - Uncapacitated Facility Location (UFLP)? (no capacity limits)
   - Capacitated Facility Location (CFLP)? (facilities have capacity limits)
   - p-Median Problem? (locate exactly p facilities)
   - p-Center Problem? (minimize maximum distance)
   - Fixed Charge Location? (fixed opening costs + variable costs)

2. **Facility Characteristics**
   - How many potential facility locations?
   - Fixed opening costs per facility?
   - Operating costs (capacity-dependent)?
   - Facility capacities (if capacitated)?
   - Can facilities serve multiple customers?

3. **Customer Requirements**
   - How many customers/demand points?
   - Customer demands (quantities)?
   - Service requirements (coverage distance/time)?
   - Single-sourcing or multi-sourcing allowed?

4. **Cost Structure**
   - Fixed costs to open facilities?
   - Transportation/distribution costs?
   - Operating costs per unit shipped?
   - Economies of scale?

5. **Constraints**
   - Must open exactly p facilities? (p-median)
   - Budget constraints?
   - Capacity constraints?
   - Coverage requirements?
   - Minimum/maximum number of facilities?

---

## Problem Classification

### 1. Uncapacitated Facility Location Problem (UFLP)

**Description:**
- Decide which facilities to open (no capacity limits)
- Assign customers to open facilities
- Minimize total fixed + transportation costs

**Characteristics:**
- Each facility can serve unlimited demand
- Most basic FLP variant
- NP-hard but solvable for moderate instances

**Applications:**
- Initial network design
- Strategic long-term planning
- High-level site selection

### 2. Capacitated Facility Location Problem (CFLP)

**Description:**
- Facilities have capacity constraints
- More realistic than UFLP
- Each customer can be served by multiple facilities

**Characteristics:**
- Capacity constraints make problem harder
- May require more facilities than UFLP
- More complex solution methods needed

**Applications:**
- Warehouse network design
- Production facility location
- Service center placement

### 3. p-Median Problem

**Description:**
- Locate exactly p facilities
- Minimize total (weighted) distance from customers to facilities
- No fixed costs, no capacity constraints

**Characteristics:**
- Number of facilities predetermined
- Focus on minimizing transportation distance
- Classic location science problem

**Applications:**
- Emergency service location
- Retail store placement
- School/hospital location

### 4. p-Center Problem

**Description:**
- Locate p facilities
- Minimize the maximum distance from any customer to nearest facility
- Minimax objective (equity-focused)

**Characteristics:**
- Ensures no customer too far from service
- Different objective than p-median
- Good for emergency services

**Applications:**
- Ambulance station location
- Fire station placement
- Emergency response planning

---

## Mathematical Formulations

### Uncapacitated Facility Location Problem (UFLP)

**Sets:**
- I = {1, ..., m}: Set of potential facility locations
- J = {1, ..., n}: Set of customers

**Parameters:**
- f_i: Fixed cost to open facility at location i
- c_{ij}: Cost to serve customer j from facility i (transportation cost)
- d_j: Demand of customer j

**Decision Variables:**
- y_i ∈ {0,1}: 1 if facility i is opened, 0 otherwise
- x_{ij} ∈ [0,1]: Fraction of customer j's demand served by facility i

**Objective Function:**
```
Minimize: Σ_i f_i * y_i + Σ_i Σ_j c_{ij} * d_j * x_{ij}
          \_____________/   \___________________________/
          Fixed costs       Transportation costs
```

**Constraints:**
```
1. Demand satisfaction: Each customer fully served
   Σ_i x_{ij} = 1,  ∀j ∈ J

2. Facility opening: Can only serve from open facilities
   x_{ij} ≤ y_i,  ∀i ∈ I, ∀j ∈ J

3. Binary facility decisions:
   y_i ∈ {0,1},  ∀i ∈ I

4. Assignment variables:
   x_{ij} ≥ 0,  ∀i ∈ I, ∀j ∈ J
```

**Complexity:** NP-hard

### Capacitated Facility Location Problem (CFLP)

**Additional Parameters:**
- Q_i: Capacity of facility i

**Modified Constraints:**
```
1. Demand satisfaction:
   Σ_i x_{ij} = 1,  ∀j ∈ J

2. Capacity constraints:
   Σ_j d_j * x_{ij} ≤ Q_i * y_i,  ∀i ∈ I

3. Opening constraints:
   x_{ij} ≤ y_i,  ∀i ∈ I, ∀j ∈ J

4. Binary variables:
   y_i ∈ {0,1},  ∀i ∈ I
   x_{ij} ≥ 0,  ∀i ∈ I, ∀j ∈ J
```

### p-Median Problem

**Objective:**
```
Minimize: Σ_i Σ_j c_{ij} * x_{ij}
```

**Constraints:**
```
1. Each customer assigned to exactly one facility:
   Σ_i x_{ij} = 1,  ∀j ∈ J

2. Exactly p facilities opened:
   Σ_i y_i = p

3. Assignment only to open facilities:
   x_{ij} ≤ y_i,  ∀i ∈ I, ∀j ∈ J

4. Binary variables:
   y_i ∈ {0,1},  ∀i ∈ I
   x_{ij} ∈ {0,1},  ∀i ∈ I, ∀j ∈ J
```

---

## Exact Solution Methods

### 1. MIP Formulation with PuLP (UFLP)

```python
from pulp import *
import numpy as np

def solve_uflp(fixed_costs, transport_costs, demands):
    """
    Solve Uncapacitated Facility Location Problem

    Args:
        fixed_costs: list of fixed costs for each facility
        transport_costs: 2D array [facilities x customers] of unit transport costs
        demands: list of customer demands

    Returns:
        dict with optimal solution
    """
    m = len(fixed_costs)  # Number of potential facilities
    n = len(demands)       # Number of customers

    # Create problem
    prob = LpProblem("UFLP", LpMinimize)

    # Decision variables
    # y[i] = 1 if facility i is opened
    y = LpVariable.dicts("facility", range(m), cat='Binary')

    # x[i,j] = fraction of customer j's demand served by facility i
    x = LpVariable.dicts("assign",
                         [(i, j) for i in range(m) for j in range(n)],
                         lowBound=0, upBound=1, cat='Continuous')

    # Objective: Minimize total cost (fixed + transportation)
    prob += (
        lpSum([fixed_costs[i] * y[i] for i in range(m)]) +
        lpSum([transport_costs[i][j] * demands[j] * x[i,j]
               for i in range(m) for j in range(n)]),
        "Total_Cost"
    )

    # Constraints

    # 1. Each customer must be fully served
    for j in range(n):
        prob += (
            lpSum([x[i,j] for i in range(m)]) == 1,
            f"Demand_Customer_{j}"
        )

    # 2. Can only serve from open facilities
    for i in range(m):
        for j in range(n):
            prob += (
                x[i,j] <= y[i],
                f"Open_Facility_{i}_{j}"
            )

    # Solve
    import time
    start_time = time.time()
    prob.solve(PULP_CBC_CMD(msg=1, timeLimit=300))
    solve_time = time.time() - start_time

    # Extract solution
    if LpStatus[prob.status] in ['Optimal', 'Feasible']:
        open_facilities = [i for i in range(m) if y[i].varValue > 0.5]

        assignments = {}
        for j in range(n):
            assignments[j] = []
            for i in range(m):
                if x[i,j].varValue > 0.01:  # Threshold for numerical issues
                    assignments[j].append((i, x[i,j].varValue))

        # Calculate cost breakdown
        fixed_cost_total = sum(fixed_costs[i] for i in open_facilities)
        transport_cost_total = sum(
            transport_costs[i][j] * demands[j] * x[i,j].varValue
            for i in range(m) for j in range(n)
        )

        return {
            'status': LpStatus[prob.status],
            'total_cost': value(prob.objective),
            'fixed_cost': fixed_cost_total,
            'transport_cost': transport_cost_total,
            'open_facilities': open_facilities,
            'num_facilities': len(open_facilities),
            'assignments': assignments,
            'solve_time': solve_time
        }
    else:
        return {
            'status': LpStatus[prob.status],
            'total_cost': None,
            'open_facilities': [],
            'solve_time': solve_time
        }


# Example usage
if __name__ == "__main__":
    # Problem data: 5 potential facilities, 10 customers
    np.random.seed(42)

    # Fixed costs to open each facility
    fixed_costs = [5000, 4500, 6000, 5500, 4800]

    # Transportation costs (facility x customer)
    # Lower cost = closer proximity
    transport_costs = np.array([
        [10, 15, 8, 20, 12, 18, 22, 14, 16, 11],
        [18, 12, 16, 14, 10, 15, 20, 25, 13, 19],
        [14, 20, 18, 10, 16, 12, 15, 18, 22, 14],
        [22, 18, 14, 16, 20, 10, 12, 16, 14, 18],
        [16, 14, 20, 18, 14, 16, 10, 12, 15, 20]
    ])

    # Customer demands
    demands = [100, 150, 80, 120, 90, 110, 130, 95, 105, 125]

    result = solve_uflp(fixed_costs, transport_costs, demands)

    print(f"\n{'='*70}")
    print(f"UNCAPACITATED FACILITY LOCATION PROBLEM - SOLUTION")
    print(f"{'='*70}")
    print(f"Status: {result['status']}")
    print(f"Total Cost: ${result['total_cost']:,.2f}")
    print(f"  Fixed Costs: ${result['fixed_cost']:,.2f}")
    print(f"  Transport Costs: ${result['transport_cost']:,.2f}")
    print(f"\nFacilities Opened: {result['num_facilities']}")
    print(f"Facility IDs: {result['open_facilities']}")
    print(f"\nSolve Time: {result['solve_time']:.2f} seconds")

    print(f"\nCustomer Assignments:")
    for customer_id, assignment in result['assignments'].items():
        print(f"  Customer {customer_id} (demand={demands[customer_id]}):")
        for facility_id, fraction in assignment:
            print(f"    → Facility {facility_id}: {fraction*100:.1f}%")
```

### 2. Capacitated Facility Location Problem (CFLP)

```python
def solve_cflp(fixed_costs, transport_costs, demands, capacities):
    """
    Solve Capacitated Facility Location Problem

    Args:
        fixed_costs: list of fixed costs for each facility
        transport_costs: 2D array [facilities x customers]
        demands: list of customer demands
        capacities: list of facility capacities

    Returns:
        dict with optimal solution
    """
    m = len(fixed_costs)
    n = len(demands)

    # Create problem
    prob = LpProblem("CFLP", LpMinimize)

    # Decision variables
    y = LpVariable.dicts("facility", range(m), cat='Binary')
    x = LpVariable.dicts("assign",
                         [(i, j) for i in range(m) for j in range(n)],
                         lowBound=0, cat='Continuous')

    # Objective
    prob += (
        lpSum([fixed_costs[i] * y[i] for i in range(m)]) +
        lpSum([transport_costs[i][j] * demands[j] * x[i,j]
               for i in range(m) for j in range(n)]),
        "Total_Cost"
    )

    # Constraints

    # 1. Each customer fully served
    for j in range(n):
        prob += (
            lpSum([x[i,j] for i in range(m)]) == 1,
            f"Demand_{j}"
        )

    # 2. Capacity constraints at each facility
    for i in range(m):
        prob += (
            lpSum([demands[j] * x[i,j] for j in range(n)]) <= capacities[i] * y[i],
            f"Capacity_{i}"
        )

    # 3. Can only serve from open facilities
    for i in range(m):
        for j in range(n):
            prob += (
                x[i,j] <= y[i],
                f"Open_{i}_{j}"
            )

    # Solve
    start_time = time.time()
    prob.solve(PULP_CBC_CMD(msg=1, timeLimit=300))
    solve_time = time.time() - start_time

    # Extract solution
    if LpStatus[prob.status] in ['Optimal', 'Feasible']:
        open_facilities = [i for i in range(m) if y[i].varValue > 0.5]

        # Calculate utilization for each open facility
        utilization = {}
        for i in open_facilities:
            used_capacity = sum(demands[j] * x[i,j].varValue for j in range(n))
            utilization[i] = (used_capacity / capacities[i]) * 100

        assignments = {}
        for j in range(n):
            assignments[j] = []
            for i in range(m):
                if x[i,j].varValue > 0.01:
                    assignments[j].append((i, x[i,j].varValue))

        return {
            'status': LpStatus[prob.status],
            'total_cost': value(prob.objective),
            'open_facilities': open_facilities,
            'num_facilities': len(open_facilities),
            'utilization': utilization,
            'assignments': assignments,
            'solve_time': solve_time
        }
    else:
        return {
            'status': LpStatus[prob.status],
            'solve_time': solve_time
        }


# Example usage
fixed_costs = [8000, 7500, 9000, 8500, 7800]
transport_costs = np.array([
    [10, 15, 8, 20, 12, 18, 22, 14, 16, 11],
    [18, 12, 16, 14, 10, 15, 20, 25, 13, 19],
    [14, 20, 18, 10, 16, 12, 15, 18, 22, 14],
    [22, 18, 14, 16, 20, 10, 12, 16, 14, 18],
    [16, 14, 20, 18, 14, 16, 10, 12, 15, 20]
])
demands = [100, 150, 80, 120, 90, 110, 130, 95, 105, 125]
capacities = [400, 350, 450, 380, 420]  # Facility capacities

result = solve_cflp(fixed_costs, transport_costs, demands, capacities)

print(f"\n{'='*70}")
print(f"CAPACITATED FACILITY LOCATION PROBLEM - SOLUTION")
print(f"{'='*70}")
print(f"Status: {result['status']}")
print(f"Total Cost: ${result['total_cost']:,.2f}")
print(f"Facilities Opened: {result['num_facilities']}")

print(f"\nFacility Utilization:")
for facility_id in result['open_facilities']:
    print(f"  Facility {facility_id}: {result['utilization'][facility_id]:.1f}% "
          f"(capacity={capacities[facility_id]})")
```

### 3. p-Median Problem

```python
def solve_p_median(distances, demands, p):
    """
    Solve p-Median Problem

    Locate exactly p facilities to minimize total weighted distance

    Args:
        distances: 2D array of distances [facilities x customers]
        demands: customer demands (weights)
        p: number of facilities to open

    Returns:
        optimal solution
    """
    m = len(distances)     # Potential facility locations
    n = len(demands)       # Customers

    prob = LpProblem("p_Median", LpMinimize)

    # Decision variables
    y = LpVariable.dicts("facility", range(m), cat='Binary')
    x = LpVariable.dicts("assign",
                         [(i, j) for i in range(m) for j in range(n)],
                         cat='Binary')

    # Objective: Minimize total weighted distance
    prob += (
        lpSum([distances[i][j] * demands[j] * x[i,j]
               for i in range(m) for j in range(n)]),
        "Total_Weighted_Distance"
    )

    # Constraints

    # 1. Each customer assigned to exactly one facility
    for j in range(n):
        prob += (
            lpSum([x[i,j] for i in range(m)]) == 1,
            f"Assign_{j}"
        )

    # 2. Exactly p facilities opened
    prob += (
        lpSum([y[i] for i in range(m)]) == p,
        "p_Facilities"
    )

    # 3. Assignment only to open facilities
    for i in range(m):
        for j in range(n):
            prob += (
                x[i,j] <= y[i],
                f"Open_{i}_{j}"
            )

    # Solve
    start_time = time.time()
    prob.solve(PULP_CBC_CMD(msg=0))
    solve_time = time.time() - start_time

    if LpStatus[prob.status] in ['Optimal', 'Feasible']:
        open_facilities = [i for i in range(m) if y[i].varValue > 0.5]

        assignments = {}
        for j in range(n):
            for i in range(m):
                if x[i,j].varValue > 0.5:
                    assignments[j] = i
                    break

        return {
            'status': LpStatus[prob.status],
            'total_distance': value(prob.objective),
            'open_facilities': open_facilities,
            'assignments': assignments,
            'solve_time': solve_time
        }
    else:
        return {'status': LpStatus[prob.status]}


# Example: Locate 3 facilities among 8 candidates to serve 12 customers
np.random.seed(42)

# Generate random coordinates
facility_coords = np.random.rand(8, 2) * 100
customer_coords = np.random.rand(12, 2) * 100

# Calculate Euclidean distance matrix
distances = np.zeros((8, 12))
for i in range(8):
    for j in range(12):
        distances[i][j] = np.linalg.norm(facility_coords[i] - customer_coords[j])

demands = [100, 150, 80, 120, 90, 110, 130, 95, 105, 125, 115, 140]
p = 3  # Open exactly 3 facilities

result = solve_p_median(distances, demands, p)

print(f"\n{'='*70}")
print(f"p-MEDIAN PROBLEM - SOLUTION")
print(f"{'='*70}")
print(f"Status: {result['status']}")
print(f"Total Weighted Distance: {result['total_distance']:,.2f}")
print(f"Facilities Opened (p={p}): {result['open_facilities']}")
print(f"\nCustomer Assignments:")
for customer_id, facility_id in result['assignments'].items():
    dist = distances[facility_id][customer_id]
    print(f"  Customer {customer_id} → Facility {facility_id} "
          f"(distance={dist:.2f}, demand={demands[customer_id]})")
```

---

## Greedy Heuristics

### 1. Greedy Add Algorithm (p-Median)

```python
def greedy_add_p_median(distances, demands, p):
    """
    Greedy heuristic for p-Median Problem

    Iteratively add facility that gives maximum cost reduction

    Time complexity: O(p * m * n)
    Quality: Typically within 10-20% of optimal

    Args:
        distances: distance matrix [facilities x customers]
        demands: customer demands
        p: number of facilities to open

    Returns:
        heuristic solution
    """
    m, n = distances.shape

    open_facilities = []
    assignments = {}

    # Initialize: assign all customers to closest potential facility
    for j in range(n):
        assignments[j] = np.argmin(distances[:, j])

    # Greedily add p facilities
    for _ in range(p):
        best_facility = None
        best_improvement = 0

        for i in range(m):
            if i in open_facilities:
                continue

            # Calculate improvement if we add facility i
            improvement = 0
            for j in range(n):
                current_dist = distances[assignments[j]][j]
                new_dist = distances[i][j]

                if new_dist < current_dist:
                    improvement += demands[j] * (current_dist - new_dist)

            if improvement > best_improvement:
                best_improvement = improvement
                best_facility = i

        if best_facility is not None:
            open_facilities.append(best_facility)

            # Update assignments
            for j in range(n):
                current_dist = distances[assignments[j]][j]
                new_dist = distances[best_facility][j]

                if new_dist < current_dist:
                    assignments[j] = best_facility

    # Calculate total cost
    total_cost = sum(
        distances[assignments[j]][j] * demands[j]
        for j in range(n)
    )

    return {
        'open_facilities': open_facilities,
        'assignments': assignments,
        'total_distance': total_cost,
        'method': 'Greedy Add'
    }
```

### 2. Greedy Drop Algorithm

```python
def greedy_drop_p_median(distances, demands, p):
    """
    Greedy drop heuristic for p-Median

    Start with all facilities, iteratively close facility
    with least impact until p remain

    Args:
        distances: distance matrix
        demands: customer demands
        p: number of facilities to keep

    Returns:
        heuristic solution
    """
    m, n = distances.shape

    # Start with all facilities open
    open_facilities = set(range(m))

    # Close facilities until only p remain
    while len(open_facilities) > p:
        best_facility_to_close = None
        min_cost_increase = float('inf')

        for i in open_facilities:
            # Test closing facility i
            test_facilities = open_facilities - {i}

            # Calculate cost with this facility closed
            cost = 0
            for j in range(n):
                min_dist = min(distances[f][j] for f in test_facilities)
                cost += min_dist * demands[j]

            if cost < min_cost_increase:
                min_cost_increase = cost
                best_facility_to_close = i

        open_facilities.remove(best_facility_to_close)

    # Final assignments
    assignments = {}
    for j in range(n):
        best_facility = min(open_facilities,
                          key=lambda f: distances[f][j])
        assignments[j] = best_facility

    total_cost = sum(
        distances[assignments[j]][j] * demands[j]
        for j in range(n)
    )

    return {
        'open_facilities': list(open_facilities),
        'assignments': assignments,
        'total_distance': total_cost,
        'method': 'Greedy Drop'
    }
```

### 3. Savings-Based Heuristic (UFLP)

```python
def savings_heuristic_uflp(fixed_costs, transport_costs, demands):
    """
    Savings-based heuristic for UFLP

    Compute savings from opening each facility and open
    facilities in order of savings

    Args:
        fixed_costs: fixed facility costs
        transport_costs: transportation costs
        demands: customer demands

    Returns:
        heuristic solution
    """
    m = len(fixed_costs)
    n = len(demands)

    # Calculate savings for each facility
    # Savings = reduction in transport cost - fixed cost
    savings = []

    for i in range(m):
        # Calculate transport cost if facility i serves customers
        transport_saving = 0

        # Assume without facility i, customers served by most expensive option
        for j in range(n):
            # Cost to serve customer j from facility i
            cost_from_i = transport_costs[i][j] * demands[j]

            # Cost to serve from next best facility
            other_costs = [transport_costs[k][j] * demands[j]
                          for k in range(m) if k != i]

            if other_costs:
                min_other_cost = min(other_costs)
                transport_saving += max(0, min_other_cost - cost_from_i)

        net_saving = transport_saving - fixed_costs[i]
        savings.append((net_saving, i))

    # Sort by savings (descending)
    savings.sort(reverse=True)

    # Open facilities with positive savings
    open_facilities = []
    for saving, facility_id in savings:
        if saving > 0:
            open_facilities.append(facility_id)

    # If no positive savings, open at least one facility
    if not open_facilities:
        # Open facility with lowest total cost for all customers
        best_facility = None
        min_cost = float('inf')

        for i in range(m):
            cost = fixed_costs[i] + sum(
                transport_costs[i][j] * demands[j] for j in range(n)
            )
            if cost < min_cost:
                min_cost = cost
                best_facility = i

        open_facilities = [best_facility]

    # Assign customers to nearest open facility
    assignments = {}
    for j in range(n):
        best_facility = min(open_facilities,
                          key=lambda i: transport_costs[i][j])
        assignments[j] = best_facility

    # Calculate total cost
    fixed_cost_total = sum(fixed_costs[i] for i in open_facilities)
    transport_cost_total = sum(
        transport_costs[assignments[j]][j] * demands[j]
        for j in range(n)
    )
    total_cost = fixed_cost_total + transport_cost_total

    return {
        'open_facilities': open_facilities,
        'assignments': assignments,
        'total_cost': total_cost,
        'fixed_cost': fixed_cost_total,
        'transport_cost': transport_cost_total,
        'method': 'Savings Heuristic'
    }
```

---

## Local Search Improvements

### 1. Facility Swap Neighborhood

```python
def facility_swap_local_search(distances, demands, initial_solution, p):
    """
    Local search with facility swap moves for p-Median

    Swap an open facility with a closed one if it improves objective

    Args:
        distances: distance matrix
        demands: customer demands
        initial_solution: starting solution
        p: number of facilities

    Returns:
        improved solution
    """
    m, n = distances.shape

    open_facilities = set(initial_solution['open_facilities'])
    closed_facilities = set(range(m)) - open_facilities

    def calculate_cost(facilities):
        """Calculate total cost for given facility set"""
        cost = 0
        for j in range(n):
            min_dist = min(distances[f][j] for f in facilities)
            cost += min_dist * demands[j]
        return cost

    current_cost = calculate_cost(open_facilities)
    improved = True

    while improved:
        improved = False
        best_swap = None
        best_cost = current_cost

        # Try all swaps
        for facility_in in closed_facilities:
            for facility_out in open_facilities:
                # Test swap
                test_facilities = (open_facilities - {facility_out}) | {facility_in}
                test_cost = calculate_cost(test_facilities)

                if test_cost < best_cost:
                    best_cost = test_cost
                    best_swap = (facility_in, facility_out)
                    improved = True

        if improved:
            facility_in, facility_out = best_swap
            open_facilities = (open_facilities - {facility_out}) | {facility_in}
            closed_facilities = (closed_facilities - {facility_in}) | {facility_out}
            current_cost = best_cost

    # Final assignments
    assignments = {}
    for j in range(n):
        best_facility = min(open_facilities,
                          key=lambda f: distances[f][j])
        assignments[j] = best_facility

    return {
        'open_facilities': list(open_facilities),
        'assignments': assignments,
        'total_distance': current_cost,
        'method': 'Facility Swap Local Search'
    }
```

### 2. Customer Reassignment

```python
def customer_reassignment(open_facilities, distances, demands):
    """
    Improve solution by optimally reassigning customers

    Given open facilities, assign each customer to nearest facility

    Args:
        open_facilities: list of open facility indices
        distances: distance matrix
        demands: customer demands

    Returns:
        optimal assignments for given facilities
    """
    n = distances.shape[1]

    assignments = {}
    for j in range(n):
        best_facility = min(open_facilities,
                          key=lambda i: distances[i][j])
        assignments[j] = best_facility

    total_cost = sum(
        distances[assignments[j]][j] * demands[j]
        for j in range(n)
    )

    return {
        'assignments': assignments,
        'total_cost': total_cost
    }
```

---

## Metaheuristics

### 1. Simulated Annealing for p-Median

```python
import random
import math

def simulated_annealing_p_median(distances, demands, p,
                                 initial_temp=1000, cooling_rate=0.95,
                                 max_iterations=5000):
    """
    Simulated Annealing for p-Median Problem

    Args:
        distances: distance matrix
        demands: customer demands
        p: number of facilities
        initial_temp: starting temperature
        cooling_rate: temperature reduction factor
        max_iterations: maximum iterations

    Returns:
        best solution found
    """
    m, n = distances.shape

    def calculate_cost(facilities):
        cost = 0
        for j in range(n):
            min_dist = min(distances[f][j] for f in facilities)
            cost += min_dist * demands[j]
        return cost

    # Initial solution: random p facilities
    current_facilities = set(random.sample(range(m), p))
    current_cost = calculate_cost(current_facilities)

    best_facilities = current_facilities.copy()
    best_cost = current_cost

    temperature = initial_temp

    for iteration in range(max_iterations):
        # Generate neighbor: swap one facility
        closed = list(set(range(m)) - current_facilities)

        if not closed:
            break

        facility_out = random.choice(list(current_facilities))
        facility_in = random.choice(closed)

        neighbor_facilities = (current_facilities - {facility_out}) | {facility_in}
        neighbor_cost = calculate_cost(neighbor_facilities)

        delta = neighbor_cost - current_cost

        # Accept or reject
        if delta < 0 or random.random() < math.exp(-delta / temperature):
            current_facilities = neighbor_facilities
            current_cost = neighbor_cost

            if current_cost < best_cost:
                best_facilities = current_facilities.copy()
                best_cost = current_cost

        # Cool down
        temperature *= cooling_rate

        if temperature < 0.1:
            break

    # Final assignments
    assignments = {}
    for j in range(n):
        best_facility = min(best_facilities,
                          key=lambda f: distances[f][j])
        assignments[j] = best_facility

    return {
        'open_facilities': list(best_facilities),
        'assignments': assignments,
        'total_distance': best_cost,
        'method': 'Simulated Annealing'
    }
```

### 2. Genetic Algorithm for UFLP

```python
def genetic_algorithm_uflp(fixed_costs, transport_costs, demands,
                          population_size=50, generations=200,
                          mutation_rate=0.15):
    """
    Genetic Algorithm for Uncapacitated Facility Location

    Args:
        fixed_costs: facility fixed costs
        transport_costs: transportation costs
        demands: customer demands
        population_size: GA population size
        generations: number of generations
        mutation_rate: mutation probability

    Returns:
        best solution
    """
    m = len(fixed_costs)
    n = len(demands)

    def decode_chromosome(chromosome):
        """Convert binary chromosome to open facilities"""
        return [i for i in range(m) if chromosome[i] == 1]

    def calculate_fitness(chromosome):
        """Calculate fitness (inverse of cost)"""
        open_facilities = decode_chromosome(chromosome)

        if not open_facilities:
            return 0  # Invalid solution

        # Fixed costs
        fixed_cost = sum(fixed_costs[i] for i in open_facilities)

        # Transportation costs
        transport_cost = 0
        for j in range(n):
            min_cost = min(transport_costs[i][j] for i in open_facilities)
            transport_cost += min_cost * demands[j]

        total_cost = fixed_cost + transport_cost
        return 1.0 / (1.0 + total_cost)

    def create_individual():
        """Create random chromosome"""
        # Ensure at least one facility open
        chromosome = [random.randint(0, 1) for _ in range(m)]
        if sum(chromosome) == 0:
            chromosome[random.randint(0, m-1)] = 1
        return chromosome

    def crossover(parent1, parent2):
        """Uniform crossover"""
        child = []
        for i in range(m):
            child.append(parent1[i] if random.random() < 0.5 else parent2[i])

        # Ensure at least one facility
        if sum(child) == 0:
            child[random.randint(0, m-1)] = 1

        return child

    def mutate(chromosome):
        """Bit flip mutation"""
        for i in range(m):
            if random.random() < mutation_rate:
                chromosome[i] = 1 - chromosome[i]

        # Ensure at least one facility
        if sum(chromosome) == 0:
            chromosome[random.randint(0, m-1)] = 1

        return chromosome

    # Initialize population
    population = [create_individual() for _ in range(population_size)]

    best_chromosome = None
    best_fitness = 0

    for generation in range(generations):
        # Evaluate fitness
        fitnesses = [calculate_fitness(ind) for ind in population]

        # Track best
        max_fitness = max(fitnesses)
        if max_fitness > best_fitness:
            best_fitness = max_fitness
            best_chromosome = population[fitnesses.index(max_fitness)].copy()

        # Selection and reproduction
        new_population = []

        # Elitism
        elite_count = int(0.1 * population_size)
        elite_indices = sorted(range(len(fitnesses)),
                             key=lambda i: fitnesses[i],
                             reverse=True)[:elite_count]
        new_population = [population[i].copy() for i in elite_indices]

        # Create offspring
        while len(new_population) < population_size:
            # Tournament selection
            parent1 = max(random.sample(list(zip(population, fitnesses)), 3),
                         key=lambda x: x[1])[0]
            parent2 = max(random.sample(list(zip(population, fitnesses)), 3),
                         key=lambda x: x[1])[0]

            child = crossover(parent1, parent2)
            child = mutate(child)

            new_population.append(child)

        population = new_population

    # Decode best solution
    open_facilities = decode_chromosome(best_chromosome)

    # Assign customers
    assignments = {}
    for j in range(n):
        best_facility = min(open_facilities,
                          key=lambda i: transport_costs[i][j])
        assignments[j] = best_facility

    # Calculate costs
    fixed_cost = sum(fixed_costs[i] for i in open_facilities)
    transport_cost = sum(
        transport_costs[assignments[j]][j] * demands[j]
        for j in range(n)
    )

    return {
        'open_facilities': open_facilities,
        'assignments': assignments,
        'total_cost': fixed_cost + transport_cost,
        'fixed_cost': fixed_cost,
        'transport_cost': transport_cost,
        'method': 'Genetic Algorithm'
    }
```

---

## Complete Facility Location Solver

```python
import time

class FacilityLocationSolver:
    """
    Comprehensive Facility Location Problem Solver

    Supports UFLP, CFLP, p-Median, and multiple solution methods
    """

    def __init__(self):
        self.fixed_costs = None
        self.transport_costs = None
        self.demands = None
        self.capacities = None
        self.problem_type = None

    def load_problem(self, fixed_costs=None, transport_costs=None,
                    demands=None, capacities=None, problem_type='UFLP'):
        """
        Load problem data

        Args:
            fixed_costs: list of facility fixed costs
            transport_costs: 2D array [facilities x customers]
            demands: customer demands
            capacities: facility capacities (for CFLP)
            problem_type: 'UFLP', 'CFLP', or 'p-Median'
        """
        self.fixed_costs = np.array(fixed_costs) if fixed_costs else None
        self.transport_costs = np.array(transport_costs)
        self.demands = np.array(demands)
        self.capacities = np.array(capacities) if capacities else None
        self.problem_type = problem_type

        print(f"Loaded {problem_type} problem:")
        print(f"  Facilities: {len(transport_costs)}")
        print(f"  Customers: {len(demands)}")
        print(f"  Total demand: {sum(demands)}")
        if capacities:
            print(f"  Total capacity: {sum(capacities)}")

    def solve_exact(self, time_limit=300):
        """
        Solve using exact MIP method

        Args:
            time_limit: time limit in seconds

        Returns:
            optimal/best solution
        """
        print(f"\nSolving {self.problem_type} with MIP (exact)...")

        if self.problem_type == 'UFLP':
            return solve_uflp(self.fixed_costs, self.transport_costs, self.demands)
        elif self.problem_type == 'CFLP':
            return solve_cflp(self.fixed_costs, self.transport_costs,
                            self.demands, self.capacities)
        else:
            raise ValueError(f"Exact solve not implemented for {self.problem_type}")

    def solve_heuristic(self, method='greedy', p=None):
        """
        Solve using heuristic method

        Args:
            method: 'greedy_add', 'greedy_drop', 'savings', 'sa', 'ga'
            p: number of facilities (for p-median)

        Returns:
            heuristic solution
        """
        print(f"\nSolving with {method} heuristic...")

        if method == 'greedy_add' and self.problem_type == 'p-Median':
            return greedy_add_p_median(self.transport_costs, self.demands, p)

        elif method == 'greedy_drop' and self.problem_type == 'p-Median':
            return greedy_drop_p_median(self.transport_costs, self.demands, p)

        elif method == 'savings' and self.problem_type == 'UFLP':
            return savings_heuristic_uflp(self.fixed_costs,
                                         self.transport_costs,
                                         self.demands)

        elif method == 'sa':
            if self.problem_type == 'p-Median':
                return simulated_annealing_p_median(
                    self.transport_costs, self.demands, p)
            else:
                raise ValueError("SA only for p-Median currently")

        elif method == 'ga' and self.problem_type == 'UFLP':
            return genetic_algorithm_uflp(self.fixed_costs,
                                         self.transport_costs,
                                         self.demands)

        else:
            raise ValueError(f"Unknown method {method} for {self.problem_type}")

    def compare_methods(self, methods, p=None):
        """
        Compare multiple solution methods

        Args:
            methods: list of method names
            p: number of facilities (for p-median)

        Returns:
            comparison dataframe
        """
        import pandas as pd

        results = []

        for method in methods:
            start_time = time.time()

            try:
                if method == 'exact':
                    solution = self.solve_exact()
                    cost_key = 'total_cost' if 'total_cost' in solution else 'total_distance'
                else:
                    solution = self.solve_heuristic(method, p)
                    cost_key = 'total_cost' if 'total_cost' in solution else 'total_distance'

                solve_time = time.time() - start_time

                results.append({
                    'Method': method,
                    'Cost': solution[cost_key],
                    'Facilities': len(solution['open_facilities']),
                    'Status': solution.get('status', 'Heuristic'),
                    'Time (s)': f"{solve_time:.3f}"
                })

            except Exception as e:
                print(f"  Error with {method}: {e}")

        df = pd.DataFrame(results)

        # Calculate gap from best
        if len(df) > 0:
            best_cost = df['Cost'].min()
            df['Gap %'] = ((df['Cost'] - best_cost) / best_cost * 100).round(2)

        return df

    def visualize_solution(self, solution, facility_coords, customer_coords):
        """
        Visualize facility location solution

        Args:
            solution: solution dictionary
            facility_coords: array of facility coordinates
            customer_coords: array of customer coordinates
        """
        import matplotlib.pyplot as plt

        plt.figure(figsize=(12, 8))

        # Plot all potential facilities (gray)
        for i, coord in enumerate(facility_coords):
            if i not in solution['open_facilities']:
                plt.plot(coord[0], coord[1], 's', color='lightgray',
                        markersize=10, alpha=0.5)

        # Plot open facilities (red)
        for i in solution['open_facilities']:
            coord = facility_coords[i]
            plt.plot(coord[0], coord[1], 's', color='red',
                    markersize=15, label='Open Facility' if i == solution['open_facilities'][0] else '')

        # Plot customers (blue)
        for j, coord in enumerate(customer_coords):
            plt.plot(coord[0], coord[1], 'o', color='blue',
                    markersize=8, alpha=0.7)

        # Draw assignments
        if 'assignments' in solution:
            for customer_id, assignment in solution['assignments'].items():
                if isinstance(assignment, int):
                    facility_id = assignment
                    fraction = 1.0
                else:
                    facility_id, fraction = assignment[0] if isinstance(assignment, list) else (assignment, 1.0)

                customer_coord = customer_coords[customer_id]
                facility_coord = facility_coords[facility_id]

                plt.plot([customer_coord[0], facility_coord[0]],
                        [customer_coord[1], facility_coord[1]],
                        'k-', alpha=0.2, linewidth=0.5)

        plt.xlabel('X Coordinate')
        plt.ylabel('Y Coordinate')
        plt.title(f'Facility Location Solution - {solution.get("method", "Unknown Method")}')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()


# Complete example
if __name__ == "__main__":
    print("="*70)
    print("FACILITY LOCATION PROBLEM - COMPREHENSIVE EXAMPLE")
    print("="*70)

    # Generate problem data
    np.random.seed(42)

    n_facilities = 10
    n_customers = 20

    # Generate coordinates
    facility_coords = np.random.rand(n_facilities, 2) * 100
    customer_coords = np.random.rand(n_customers, 2) * 100

    # Calculate distance matrix
    distances = np.zeros((n_facilities, n_customers))
    for i in range(n_facilities):
        for j in range(n_customers):
            distances[i][j] = np.linalg.norm(
                facility_coords[i] - customer_coords[j]
            )

    # Problem parameters
    fixed_costs = np.random.uniform(5000, 8000, n_facilities)
    transport_costs = distances * 10  # Cost per unit per distance
    demands = np.random.uniform(50, 200, n_customers)
    capacities = np.random.uniform(800, 1200, n_facilities)

    # Solve UFLP
    print("\n" + "="*70)
    print("UNCAPACITATED FACILITY LOCATION PROBLEM")
    print("="*70)

    solver = FacilityLocationSolver()
    solver.load_problem(fixed_costs, transport_costs, demands, problem_type='UFLP')

    # Compare methods
    comparison = solver.compare_methods(['exact', 'savings', 'ga'])
    print("\nMethod Comparison:")
    print(comparison.to_string(index=False))

    # Solve and visualize best solution
    best_solution = solver.solve_exact()
    print(f"\nBest Solution:")
    print(f"  Total Cost: ${best_solution['total_cost']:,.2f}")
    print(f"  Fixed Cost: ${best_solution['fixed_cost']:,.2f}")
    print(f"  Transport Cost: ${best_solution['transport_cost']:,.2f}")
    print(f"  Facilities Opened: {len(best_solution['open_facilities'])}")
    print(f"  Facility IDs: {best_solution['open_facilities']}")

    # Visualize
    solver.visualize_solution(best_solution, facility_coords, customer_coords)
```

---

## Tools & Libraries

### Python Libraries

**Optimization:**
- **PuLP**: MIP modeling (recommended for UFLP/CFLP)
- **Pyomo**: Advanced optimization modeling
- **OR-Tools (Google)**: Fast heuristics and exact methods
- **Gurobi**: Commercial solver (academic license available)
- **CPLEX**: IBM commercial solver

**Specialized:**
- **scikit-learn**: Clustering for facility location
- **scipy.optimize**: General optimization
- **geopy**: Distance calculations with real coordinates

**Visualization:**
- **matplotlib**: Basic visualization
- **plotly**: Interactive maps
- **folium**: Geographic visualization
- **seaborn**: Statistical visualization

### Commercial Software

- **Gurobi Optimizer**: State-of-art MIP solver
- **IBM ILOG CPLEX**: Enterprise optimization
- **FICO Xpress**: Optimization suite
- **AMPL**: Modeling language + solvers

### Cloud Services

- **Google Maps Platform**: Distance Matrix API
- **AWS Location Service**: Location-based services
- **Azure Maps**: Microsoft mapping service

---

## Common Challenges & Solutions

### Challenge: Large-Scale Problems

**Problem:**
- 1000s of potential facilities
- 10,000s of customers
- Exact methods too slow

**Solutions:**
- Use heuristics (savings, greedy add/drop)
- Lagrangian relaxation
- Decomposition methods (Benders)
- Metaheuristics (SA, GA, Tabu Search)
- Preprocessing to reduce problem size
- Clustering customers before solving

### Challenge: Capacity Constraints

**Problem:**
- CFLP is harder than UFLP
- May need many facilities
- Difficult to get tight bounds

**Solutions:**
- Valid inequalities to strengthen formulation
- Branch-and-price algorithms
- Column generation
- Specialized heuristics
- Consider multi-sourcing if allowed

### Challenge: Multiple Objectives

**Problem:**
- Minimize cost AND maximize service
- Trade-off between # facilities and service quality
- Stakeholder preferences vary

**Solutions:**
- Multi-objective optimization
- Weighted sum method
- Epsilon-constraint method
- Pareto frontier analysis
- Scenario analysis with different weights

### Challenge: Dynamic Demand

**Problem:**
- Demand changes over time
- Seasonal variations
- Facility decisions long-term

**Solutions:**
- Robust optimization
- Stochastic programming
- Scenario-based planning
- Flexible/modular facility design
- Rolling horizon approach

### Challenge: Real-World Distances

**Problem:**
- Euclidean distances unrealistic
- Need actual road networks
- Traffic considerations

**Solutions:**
- Use Google Maps Distance Matrix API
- Pre-compute actual distances
- Consider time-of-day effects
- Use real logistics data

---

## Output Format

### Facility Location Solution Report

**Problem Instance:**
- Problem Type: Uncapacitated Facility Location
- Potential Facilities: 10
- Customers: 20
- Total Demand: 2,450 units
- Optimization: Minimize fixed + transportation costs

**Optimal Solution:**

| Metric | Value |
|--------|-------|
| Total Cost | $87,342 |
| Fixed Costs | $23,500 |
| Transportation Costs | $63,842 |
| Facilities Opened | 4 |
| Average Demand per Facility | 612.5 units |
| Solution Time | 3.7 seconds |
| Solution Status | Optimal |

**Open Facilities:**

| Facility ID | Location | Fixed Cost | Customers Served | Total Demand |
|-------------|----------|------------|------------------|--------------|
| 2 | (34.2, 67.8) | $6,200 | 6 | 720 units |
| 5 | (78.1, 23.4) | $5,800 | 5 | 590 units |
| 7 | (12.5, 45.9) | $5,900 | 4 | 480 units |
| 9 | (56.3, 89.2) | $5,600 | 5 | 660 units |

**Customer Assignments:**

| Customer | Demand | Assigned Facility | Distance | Transport Cost |
|----------|--------|-------------------|----------|----------------|
| C01 | 120 | Facility 2 | 12.3 km | $1,476 |
| C02 | 150 | Facility 5 | 8.7 km | $1,305 |
| ... | ... | ... | ... | ... |

**Cost Breakdown:**
- Fixed costs: 26.9% of total
- Transportation costs: 73.1% of total
- Average cost per unit: $35.67

---

## Questions to Ask

If you need more context:

1. What type of facility location problem? (UFLP, CFLP, p-Median, p-Center)
2. How many potential facility locations? How many customers?
3. What are the fixed costs to open facilities?
4. Are there capacity constraints on facilities?
5. What are the transportation/service costs?
6. Do you have coordinates or a distance matrix?
7. Is demand fixed or variable/uncertain?
8. Are there minimum or maximum number of facilities?
9. Single-sourcing (one facility per customer) or multi-sourcing allowed?
10. What's the planning horizon? (short-term tactical vs. long-term strategic)
11. Any special requirements? (coverage distance, service levels)
12. Budget constraints on total capital investment?

---

## Related Skills

- **hub-location-problem**: For hub-and-spoke networks
- **warehouse-location-optimization**: Warehouse-specific considerations
- **distribution-center-network**: Distribution network design
- **network-design**: Broader supply chain network design
- **set-covering-problem**: Coverage-based facility location
- **network-flow-optimization**: Flow-based facility allocation
- **optimization-modeling**: General MIP formulation techniques
- **multi-objective-optimization**: Multiple criteria optimization
- **stochastic-optimization**: Uncertain demand scenarios
- **inventory-routing-problem**: Joint location-inventory-routing
