import express from "express";

const app = express();
app.use(express.json());

let products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Mouse", price: 1000 },
  { id: 3, name: "Keyboard", price: 2000 }
];

app.get("/products", (req, res) => {
  res.json(products);
});


app.get("/products/:id", (req, res) => {
  const product = products.find(
    (p) => p.id === Number(req.params.id)
  );

  if (!product) {
    return res.status(404).send("Product not found");
  }

  res.json(product);
});


app.post("/products", (req, res) => {
  const newProduct = {
    id: products.length
      ? Math.max(...products.map((p) => p.id)) + 1
      : 1,
    name: req.body.name,
    price: req.body.price
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});


app.put("/products/:id", (req, res) => {
  const product = products.find(
    (p) => p.id === Number(req.params.id)
  );

  if (!product) {
    return res.status(404).send("Product not found");
  }

  product.name = req.body.name ?? product.name;
  product.price = req.body.price ?? product.price;

  res.json(product);
});


app.delete("/products/:id", (req, res) => {
  const id = Number(req.params.id);

  const productExists = products.some(
    (p) => p.id === id
  );

  if (!productExists) {
    return res.status(404).send("Product not found");
  }

  products = products.filter((p) => p.id !== id);

  res.send("Product deleted");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});