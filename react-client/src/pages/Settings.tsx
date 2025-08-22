import { useState, useEffect } from "react";
import { updateEmail, updateUsername } from "../api/auth"; // axios helpers
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
      navigate("/"); // redirect nếu chưa login
    } else {
      setToken(savedToken);
    }
  }, []);

  async function handleEmailUpdate() {
    if (!email || !token) return;
    try {
      await updateEmail({ token, email });
      alert("Email updated!");
      setEmail("");
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  }

  async function handleUsernameUpdate() {
    if (!username || !token) return;
    try {
      await updateUsername({ token, username });
      alert("Username updated!");
      setUsername("");
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Update Email */}
      <div className="flex flex-col gap-2 bg-white p-4 rounded shadow-md w-80">
        <label>Email</label>
        <input
          type="email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter new email"
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleEmailUpdate}
        >
          Update Email
        </button>
      </div>

      {/* Update Username */}
      <div className="flex flex-col gap-2 bg-white p-4 rounded shadow-md w-80">
        <label>Username</label>
        <input
          type="text"
          className="border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter new username"
        />
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handleUsernameUpdate}
        >
          Update Username
        </button>
      </div>
    </div>
  );
}
