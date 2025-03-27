export default function Button({ children, onClick, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-primary text-white px-5 py-2 rounded-lg shadow-md hover:bg-[#5a0909] transition-all duration-200 ${className}`}
    >
      {children}
    </button>
  );
}
