
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

FILE = "sales.json"

def load_data():
    if not os.path.exists(FILE):
        return []
    with open(FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(FILE, "w") as f:
        json.dump(data, f, indent=4)

# GET all sales
@app.route("/sales", methods=["GET"])
def get_sales():
    return jsonify(load_data())

# ADD new sale
@app.route("/sales", methods=["POST"])
def add_sale():
    data = load_data()
    new_sale = request.json
    data.append(new_sale)
    save_data(data)
    return jsonify({"message": "Saved successfully"})

# CLEAR sales
@app.route("/sales", methods=["DELETE"])
def clear_sales():
    save_data([])
    return jsonify({"message": "All data deleted"})

if __name__ == "__main__":
    app.run(debug=True)