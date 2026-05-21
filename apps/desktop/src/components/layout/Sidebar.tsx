import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Receipt,
  UserCog,
  Settings,
  LogOut,
  FileBarChart2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/clientes", icon: <Users size={18} />, label: "Clientes" },
  { to: "/produtos", icon: <Package size={18} />, label: "Produtos" },
  { to: "/cautelas", icon: <ClipboardList size={18} />, label: "Cautelas" },
  { to: "/recibos", icon: <Receipt size={18} />, label: "Recibos" },
  { to: "/relatorios", icon: <FileBarChart2 size={18} />, label: "Relatórios" },
  { to: "/ajuda", icon: <HelpCircle size={18} />, label: "Ajuda" },
  { to: "/usuarios", icon: <UserCog size={18} />, label: "Usuários", adminOnly: true },
  { to: "/configuracoes", icon: <Settings size={18} />, label: "Configurações", adminOnly: true },
];

export default function Sidebar() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || usuario?.perfil === "admin");

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="w-52 min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <div className="px-4 py-5 border-b border-slate-700">
        <p className="font-bold text-sm text-white">App Cautelas</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{usuario?.nome_completo}</p>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
