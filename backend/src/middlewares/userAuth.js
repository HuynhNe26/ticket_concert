import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Thiếu token" });
  }

  const token = authHeader.split(" ")[1]; // Bearer xxx

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⬇️ GẮN USER VÀO REQUEST
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
}