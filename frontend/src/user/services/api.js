export const API = process.env.REACT_APP_API_URL;

export const addToCart = (data) =>
  fetch(`${API}/api/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
