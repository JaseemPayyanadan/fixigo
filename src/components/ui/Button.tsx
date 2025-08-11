import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
}

const base =
  "px-4 py-2 rounded-lg font-semibold transition shadow focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-gray-300 text-gray-800 hover:bg-gray-100",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => (
  <button
    className={`${base} ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button; 