import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const verifyToken = (req, res, next) => {
  const token = req.cookies?.accessToken;
  try {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated Users",
      });
    }
    const data = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
    if (!data)
      return res
        .status(403)
        .json({ success: false, message: "Unauthenticated Users" });

    req.User = data;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Unauthenticated Users",
    });
  }
};

export default verifyToken;
