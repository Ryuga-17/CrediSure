"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, LogIn, Home, BookOpen, Users, Info } from "lucide-react"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  // Navigation links with icons
  const navLinks = [
    { name: "Home", path: "/", icon: <Home className="h-5 w-5" /> },
    { name: "About us", path: "/AboutUs", icon: <Info className="h-5 w-5" /> },
    { name: "Features", path: "/Features", icon: <BookOpen className="h-5 w-5" /> },
    { name: "Guide", path: "/guide", icon: <Users className="h-5 w-5" /> },
  ]

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const [isLoggedIn] = useState(false); // Track login state

  return (
    <nav
      className={`relative w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--color-background)]"
          : "bg-black"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-20">
          <div className="flex items-center justify-start w-1/4 pr-6">
            <Link href="/" className="group flex items-center space-x-3 overflow-hidden">
              <div className="relative h-12 w-12 transition-transform duration-500 group-hover:scale-110">
                <svg
                  className="h-12 w-12 text-white"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="32" cy="32" r="30" fill="url(#radialGradient)" className="opacity-20" />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="animate-[spin_20s_linear_infinite]"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="16"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    className="animate-[spin_15s_linear_infinite_reverse]"
                  />
                  <path d="M32 12L44.7846 32.7692H19.2154L32 12Z" fill="currentColor" className="drop-shadow-md" />
                  <path d="M32 52L44.7846 31.2308H19.2154L32 52Z" fill="currentColor" className="drop-shadow-md" />
                  <circle cx="32" cy="32" r="8" fill="white" className="animate-[pulse_2s_ease-in-out_infinite]" />
                  <path
                    d="M32 8L32 56"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="drop-shadow-md"
                  />
                  <defs>
                    <radialGradient id="radialGradient" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <div className="font-bold text-2xl text-white transition-all duration-300 group-hover:[var(--color-accent)] overflow-hidden">
                Credi<span className="text-[var(--color-golden)] overflow-hidden">Sure</span>
              </div>
            </Link>
          </div>
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="flex items-center space-x-2 px-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.path
                return (
                  <Link
                    key={link.name}
                    href={link.path}
                    className={`flex items-center space-x-2 mx-1 px-4 py-2.5 rounded-md
                      transition-all duration-300 text-[var(--color-text)] hover:text-[var(--color-golden)]
                      relative group overflow-hidden ${isActive ? "text-[var(--color-golden)]" : ""}`}
                  >
                    <span className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                      {link.icon}
                    </span>
                    <span className="relative z-10 font-medium">{link.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden md:flex items-center justify-end w-1/4 pl-6">
            <div className="flex items-center space-x-3">
            {isLoggedIn ? (
              <>
              <Link
                href="/signup"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-md
                  transition-all duration-300 text-[var(--color-text)] hover:text-[var(--color-background)] hover:bg-[var(--color-golden)] relative group overflow-hidden"
                aria-label="Login"
              >
                <span className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                  <LogIn className="h-5 w-5" />
                </span>
                <span className="relative z-10">Logout</span>
                <span
                  className="absolute inset-0 group-hover:bg-[var(--color-muted-gold)]
                  transition-all duration-300 transform translate-y-full group-hover:scale-110 group-hover:translate-y-0 rounded-md"
                ></span>
              </Link>
              </>
            ) : (
              <>
              <Link
                href="/signup"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-md
                  transition-all duration-300 text-[var(--color-text)] hover:text-[var(--color-background)] hover:bg-[var(--color-golden)] relative group overflow-hidden"
                aria-label="Login"
              >
                <span className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                  <LogIn className="h-5 w-5" />
                </span>
                <span className="relative z-10">Login</span>
                <span
                  className="absolute inset-0 group-hover:bg-[var(--color-muted-gold)]
                  transition-all duration-300 transform translate-y-full group-hover:scale-110 group-hover:translate-y-0 rounded-md"
                ></span>
              </Link>
              </>
            )}
            </div>
          </div>
          <div className="md:hidden flex items-center justify-end flex-1">
            <button
              className="p-2 rounded-lg transition-colors duration-300
                text-[var(--color-text)] hover:text-[var(--color-golden)] focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-7 w-7 transition-transform duration-300" />
              ) : (
                <Menu className="h-7 w-7 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-3 border-t border-white/10">
            <div className="grid grid-cols-1 gap-2 px-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.path
                return (
                  <Link
                    key={link.name}
                    href={link.path}
                    className={`flex items-center space-x-3 px-4 py-3.5 rounded-md 
                      transition-all duration-300 text-[var(--color-text)] hover:bg-[var(--color-golden)] hover:text-[var(--color-background)] group
                      ${isActive ? "bg-[var(--color-muted-gold)] text-black" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={`text-white/80 transition-transform group-hover:text-[var(--color-background)] group-hover:scale-110 duration-300 group ${isActive ? "text-black" : ""}`}>
                      {link.icon}
                    </span>
                    <span className="font-medium">{link.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="py-4 border-t border-white/10 flex space-x-3 px-1">
            <Link
              href="/signup"
              className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg 
                border border-white/20 text-[var(--color-text)] transition-all duration-300 hover:bg-[var(--color-golden)] hover:text-[var(--color-background)]"
              onClick={() => setIsOpen(false)}
            >
              <LogIn className="h-5 w-5" />
              <span className="font-medium">Login</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

