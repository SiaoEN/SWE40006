import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <p>KCH Bites Web Page</p>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </main>
  );
}