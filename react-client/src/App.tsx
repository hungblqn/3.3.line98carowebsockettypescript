import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { register, login } from "./api/auth";
import Header from "./components/Header";
import Line98 from "./pages/Line98";
import Caro from "./pages/Caro";
import Settings from "./pages/Settings";

function Home({ token, setToken }: { token: string | null; setToken: any }) {
  const [showForm, setShowForm] = useState<"login" | "register" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  async function handleRegister() {
    try {
      await register(username, password);
      alert("Đăng ký thành công!");
      setShowForm(null);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      alert("Lỗi đăng ký: " + (err.response?.data?.message || err.message));
    }
  }

  async function handleLogin() {
    try {
      const data = await login(username, password);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      alert("Đăng nhập thành công!");
      setShowForm(null);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      alert("Lỗi đăng nhập: " + (err.response?.data?.message || err.message));
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        {showForm === null && (
          <div className="flex gap-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => setShowForm("login")}
            >
              Đăng nhập
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => setShowForm("register")}
            >
              Đăng ký
            </button>
          </div>
        )}
        {showForm !== null && (
          <div className="flex flex-col gap-3 items-center bg-white p-6 rounded shadow-lg">
            <input
              className="border p-2 rounded w-64"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="border p-2 rounded w-64"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {showForm === "login" ? (
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
                onClick={handleLogin}
              >
                Đăng nhập
              </button>
            ) : (
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
                onClick={handleRegister}
              >
                Đăng ký
              </button>
            )}
            <button
              className="text-gray-500 text-sm mt-2 hover:underline"
              onClick={() => setShowForm(null)}
            >
              Quay lại
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 gap-4">
      <h1 className="text-xl font-semibold text-green-600">Chào mừng! Bạn đã đăng nhập.</h1>
      <div className="flex gap-4">
        <a
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          href="/line98"
        >
          Chơi Line98
        </a>
        <a
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          href="/caro"
        >
          Chơi Cờ Caro
        </a>
        <a
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          href="/settings"
        >
          Cài đặt
        </a>
      </div>
      <button
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        onClick={() => {
          localStorage.removeItem("token");
          setToken(null);
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home token={token} setToken={setToken} />} />
        <Route path="/line98" element={<Line98 />} />
        <Route path="/caro" element={<Caro />} />
        <Route path="/settings" element={<Settings/>} />
      </Routes>
    </BrowserRouter>
  );
}
