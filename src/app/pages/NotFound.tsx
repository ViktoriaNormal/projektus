import { Link } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-3xl font-bold mt-4 mb-2">Страница не найдена</h2>
        <p className="text-slate-600 mb-6">
          К сожалению, запрашиваемая страница не существует
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
        >
          <Home size={20} />
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
