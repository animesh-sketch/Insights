"""BloomCart - Beautiful Flower Shop Website"""

from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="static")

# Flower catalog
FLOWERS = [
    {
        "id": 1,
        "name": "Red Roses Bouquet",
        "price": 49.99,
        "image": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=400&fit=crop",
        "description": "A stunning bouquet of 12 fresh red roses, perfect for expressing love and romance.",
        "category": "bouquets",
    },
    {
        "id": 2,
        "name": "Sunflower Delight",
        "price": 35.99,
        "image": "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=400&fit=crop",
        "description": "Bright and cheerful sunflowers to light up any room. Includes 8 stems.",
        "category": "singles",
    },
    {
        "id": 3,
        "name": "Lavender Dreams",
        "price": 29.99,
        "image": "https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=400&h=400&fit=crop",
        "description": "Fragrant lavender bundle that brings calm and elegance to your space.",
        "category": "singles",
    },
    {
        "id": 4,
        "name": "Spring Mix Arrangement",
        "price": 59.99,
        "image": "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=400&fit=crop",
        "description": "A vibrant mix of seasonal spring flowers in a beautiful ceramic vase.",
        "category": "arrangements",
    },
    {
        "id": 5,
        "name": "White Lily Elegance",
        "price": 44.99,
        "image": "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=400&h=400&fit=crop",
        "description": "Pure white lilies symbolizing grace and refined beauty. 6 stems included.",
        "category": "singles",
    },
    {
        "id": 6,
        "name": "Pink Peony Paradise",
        "price": 54.99,
        "image": "https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=400&h=400&fit=crop",
        "description": "Lush pink peonies arranged with greenery for a romantic touch.",
        "category": "bouquets",
    },
    {
        "id": 7,
        "name": "Tropical Orchid",
        "price": 39.99,
        "image": "https://images.unsplash.com/photo-1566873535350-a3f5d4a804b7?w=400&h=400&fit=crop",
        "description": "Exotic orchid plant in a decorative pot. Long-lasting and low maintenance.",
        "category": "plants",
    },
    {
        "id": 8,
        "name": "Wildflower Meadow",
        "price": 32.99,
        "image": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=400&fit=crop",
        "description": "A rustic bundle of colorful wildflowers, bringing nature indoors.",
        "category": "bouquets",
    },
    {
        "id": 9,
        "name": "Succulent Garden",
        "price": 27.99,
        "image": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop",
        "description": "A curated collection of mini succulents in a wooden planter box.",
        "category": "plants",
    },
    {
        "id": 10,
        "name": "Tulip Festival",
        "price": 38.99,
        "image": "https://images.unsplash.com/photo-1524386416438-98b9b2d4b433?w=400&h=400&fit=crop",
        "description": "20 colorful Dutch tulips wrapped in kraft paper. A timeless classic.",
        "category": "bouquets",
    },
    {
        "id": 11,
        "name": "Luxury Rose Box",
        "price": 89.99,
        "image": "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&h=400&fit=crop",
        "description": "24 premium roses arranged in an elegant hat box. The ultimate gift.",
        "category": "arrangements",
    },
    {
        "id": 12,
        "name": "Daisy Sunshine",
        "price": 24.99,
        "image": "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=400&h=400&fit=crop",
        "description": "Happy white daisies bundled with baby's breath. Simple and sweet.",
        "category": "singles",
    },
]

# In-memory cart (for demo purposes)
cart = []


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/flowers")
def get_flowers():
    """Return all flowers, optionally filtered by category."""
    category = request.args.get("category")
    if category and category != "all":
        filtered = [f for f in FLOWERS if f["category"] == category]
        return jsonify(filtered)
    return jsonify(FLOWERS)


@app.route("/api/cart", methods=["GET"])
def get_cart():
    """Return current cart contents."""
    return jsonify(cart)


@app.route("/api/cart", methods=["POST"])
def add_to_cart():
    """Add a flower to the cart."""
    data = request.get_json()
    flower_id = data.get("id")
    quantity = data.get("quantity", 1)

    flower = next((f for f in FLOWERS if f["id"] == flower_id), None)
    if not flower:
        return jsonify({"error": "Flower not found"}), 404

    # Check if already in cart
    existing = next((item for item in cart if item["id"] == flower_id), None)
    if existing:
        existing["quantity"] += quantity
    else:
        cart.append({**flower, "quantity": quantity})

    return jsonify({"status": "ok", "cart": cart})


@app.route("/api/cart/<int:flower_id>", methods=["DELETE"])
def remove_from_cart(flower_id):
    """Remove a flower from the cart."""
    global cart
    cart = [item for item in cart if item["id"] != flower_id]
    return jsonify({"status": "ok", "cart": cart})


@app.route("/api/cart/clear", methods=["POST"])
def clear_cart():
    """Clear the entire cart."""
    cart.clear()
    return jsonify({"status": "ok", "cart": cart})


@app.route("/api/order", methods=["POST"])
def place_order():
    """Place an order (demo - just clears cart and returns confirmation)."""
    data = request.get_json()
    if not cart:
        return jsonify({"error": "Cart is empty"}), 400

    total = sum(item["price"] * item["quantity"] for item in cart)
    order_summary = {
        "status": "confirmed",
        "message": "Thank you for your order! Your flowers will be delivered soon.",
        "items": len(cart),
        "total": round(total, 2),
        "customer": data.get("name", "Valued Customer"),
    }
    cart.clear()
    return jsonify(order_summary)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
