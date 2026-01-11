"use client";

import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="bg-[var(--color-background)] py-24">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center">
        {/* Left Side - Text Content */}
        <div className="md:w-1/2 text-left">
          <h1 className="text-5xl md:text-6xl font-extrabold text-[var(--color-golden)] overflow-hidden">
            Take Control of <span className="text-[var(--color-secondary-golden)]">Your Credit!</span>
          </h1>
          <p className="text-lg text-[var(--color-text)] mt-4 tracking-wide">
            AI-driven insights, smarter decisions, <br /> <span className="text-[var(--color-secondary-golden)] font-semibold">financial success!</span>
          </p>
          <a
            href="/signup"
            className="mt-6 inline-block bg-[var(--color-golden)] text-[var(--color-background)] px-6 py-3 rounded-lg text-lg font-semibold shadow-md transition-all duration-300 
            hover:bg-[var(--color-muted-gold)] hover:shadow-lg hover:scale-105 hover:text-black">
            Get Started Today!
          </a>

        </div>

        {/* Right Side - Image */}
        <div className="md:w-1/2 mt-10 md:mt-0">
        <Image
        src="/bank-convo.webp"
        alt="Credit Analysis"
        width={800}
        height={400}
        className="w-full my-8 h-[400px] object-cover rounded-lg shadow-lg"
        />
        </div>
      </div>
    </div>
  );
}
