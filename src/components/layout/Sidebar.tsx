"use client";
import { usePathname } from "next/navigation";
import { BsLayoutSidebarInset } from "react-icons/bs";
import { MdDashboard, MdTimer, MdPictureAsPdf, MdPhotoSizeSelectActual } from "react-icons/md";
import { GiNotebook } from "react-icons/gi";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: MdDashboard },
    { href: "/settimepage", label: "Set Timer", icon: MdTimer },
    { href: "/noteidea", label: "Idea Notes", icon: GiNotebook },
    { href: "/pdfeditor", label: "PDF Annotator", icon: MdPictureAsPdf },
    { href: "/background-removal", label: "Remove BG", icon: MdPhotoSizeSelectActual },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-45 bg-gray-900 z-40 border-r border-amber-400/20 flex-col">

            {/* Top icon */}
            <div className="flex justify-center items-center py-5 border-b border-gray-700/50">
                <BsLayoutSidebarInset size={22} className="text-amber-400" />
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1.5 p-3 flex-1 mt-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <a
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-serif text-sm transition-all duration-150
                                ${isActive
                                    ? "bg-amber-400/15 text-amber-400 border border-amber-400/25 shadow-sm"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                        >
                            <Icon size={18} className="shrink-0" />
                            <span className="truncate">{label}</span>
                        </a>
                    );
                })}
            </nav>

            {/* Bottom label */}
            <div className="px-4 py-4 border-t border-gray-700/50">
                <p className="text-[10px] text-gray-600 text-center tracking-widest uppercase">Menu</p>
            </div>
        </aside>
    );
}
