from flask import Flask, render_template, request, jsonify
import heapq
import sqlite3
import time

app = Flask(__name__)

# =========================
# 🌌 GRAPH
# =========================
graph = {
    "Earth": {"Mars": 50, "Venus": 30, "Mercury": 20},
    "Mercury": {"Venus": 25},
    "Mars": {"Jupiter": 70},
    "Venus": {"Jupiter": 60, "Uranus": 80},
    "Jupiter": {"Saturn": 40, "Neptune": 90},
    "Saturn": {"Pluto": 100},
    "Uranus": {"Neptune": 30},
    "Neptune": {"Pluto": 50},
    "Pluto": {}
}

# =========================
# 🔮 HEURISTIC
# =========================
heuristic = {
    "Earth": 120,
    "Mercury": 110,
    "Venus": 90,
    "Mars": 80,
    "Jupiter": 60,
    "Saturn": 40,
    "Uranus": 30,
    "Neptune": 20,
    "Pluto": 0
}

# =========================
# 🟢 BFS
# =========================
def bfs(start, goal):
    queue = [(start, [start])]
    visited = set()

    while queue:
        node, path = queue.pop(0)

        if node == goal:
            return path

        visited.add(node)

        for neighbor in graph.get(node, {}):
            if neighbor not in visited:
                queue.append((neighbor, path + [neighbor]))

    return None


# =========================
# 🔵 DFS
# =========================
def dfs(start, goal):
    stack = [(start, [start])]
    visited = set()

    while stack:
        node, path = stack.pop()

        if node == goal:
            return path

        visited.add(node)

        for neighbor in graph.get(node, {}):
            if neighbor not in visited:
                stack.append((neighbor, path + [neighbor]))

    return None


# =========================
# 🔴 A*
# =========================
def astar(start, goal):
    pq = [(0, start, [start])]
    visited = set()

    while pq:
        cost, node, path = heapq.heappop(pq)

        if node == goal:
            return path

        visited.add(node)

        for neighbor in graph.get(node, {}):
            if neighbor not in visited:
                new_cost = cost + graph[node][neighbor]
                priority = new_cost + heuristic.get(neighbor, 0)
                heapq.heappush(pq, (priority, neighbor, path + [neighbor]))

    return None


# =========================
# 🟡 BEST FIRST
# =========================
def best_first(start, goal):
    pq = [(heuristic.get(start, 0), start, [start])]
    visited = set()

    while pq:
        _, node, path = heapq.heappop(pq)

        if node == goal:
            return path

        visited.add(node)

        for neighbor in graph.get(node, {}):
            if neighbor not in visited:
                heapq.heappush(pq, (heuristic.get(neighbor, 0), neighbor, path + [neighbor]))

    return None


# =========================
# 🟣 HILL CLIMBING
# =========================
def hill_climbing(start, goal):
    current = start
    path = [current]

    while current != goal:
        neighbors = graph.get(current, {})

        if not neighbors:
            return path

        next_node = min(neighbors, key=lambda x: heuristic.get(x, float('inf')))

        if heuristic.get(next_node, float('inf')) >= heuristic.get(current, float('inf')):
            return path

        current = next_node
        path.append(current)

    return path


# =========================
# ⚔️ MINIMAX
# =========================
def minimax(start, goal):
    return astar(start, goal)


# =========================
# ⏱ RUN + MEASURE
# =========================
def run_algorithm(func, start, end):
    start_time = time.time()
    path = func(start, end)
    end_time = time.time()

    return {
        "path": path,
        "nodes": len(path) if path else 0,
        "time_taken": round((end_time - start_time) * 1000, 2)
    }


# =========================
# 💾 SAVE HISTORY
# =========================
def save_history(start, end, algo, fuel, time_val):
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start TEXT,
            end TEXT,
            algorithm TEXT,
            fuel INTEGER,
            time INTEGER
        )
    ''')

    cur.execute('''
        INSERT INTO history (start, end, algorithm, fuel, time)
        VALUES (?, ?, ?, ?, ?)
    ''', (start, end, algo, fuel, time_val))

    conn.commit()
    conn.close()


# =========================
# 🏠 HOME
# =========================
@app.route('/')
def home():
    return render_template("index.html")

# =========================
# 🌌 LANDING PAGE
# =========================
@app.route('/landing')
def landing():
    return render_template("landing.html")

# =========================
# 🚀 MAIN API (UPDATED)
# =========================
@app.route('/find-path', methods=['POST'])
def find_path():
    data = request.get_json()

    start = data.get('start')
    end = data.get('end')
    algo = data.get('algorithm')

    # 🔥 RUN ALL ALGORITHMS
    results = {
        "BFS": run_algorithm(bfs, start, end),
        "DFS": run_algorithm(dfs, start, end),
        "A*": run_algorithm(astar, start, end),
        "Best First": run_algorithm(best_first, start, end),
        "Hill Climbing": run_algorithm(hill_climbing, start, end)
    }

    # 🎯 SELECT ALGO
    if algo == "AUTO":
        selected = results["A*"]
        algo = "A* (AUTO)"
    else:
        selected = results.get(algo, results["A*"])

    path = selected["path"]

    if not path:
        return jsonify({
            "path": [],
            "fuel": 0,
            "time": 0,
            "comparison": results,
            "error": "No path found"
        })

    # =========================
    # 🔥 REAL FUEL CALCULATION
    # =========================
    fuel = 0
    for i in range(len(path) - 1):
        fuel += graph[path[i]][path[i+1]]

    # =========================
    # ⏱ TIME BASED ON ALGO
    # =========================
    algo_factor = {
        "BFS": 1.2,
        "DFS": 1.5,
        "A*": 1.0,
        "Best First": 1.1,
        "Hill Climbing": 1.3,
        "A* (AUTO)": 1.0
    }

    time_val = int(fuel * algo_factor.get(algo, 1.2))

    save_history(start, end, algo, fuel, time_val)

    return jsonify({
        "path": path,
        "fuel": fuel,
        "time": time_val,
        "comparison": results
    })


# =========================
# ▶️ RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)