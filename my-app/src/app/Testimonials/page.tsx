"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
    {
        name: "Sarah Johnson",
        role: "Risk Manager, Global Bank",
        content: "This tool has revolutionized our credit assessment process. The AI-driven insights have significantly improved our decision-making accuracy.",
        rating: 5
    },
    {
        name: "Michael Chen",
        role: "CEO, FinTech Solutions",
        content: "The integration was seamless, and the results were immediate. Our loan approval process is now faster and more reliable than ever.",
        rating: 5
    },
    {
        name: "Emma Williams",
        role: "Head of Credit, Regional Bank",
        content: "The regulatory compliance features give us peace of mind, while the risk scoring model helps us make better lending decisions.",
        rating: 5
    }
];

const TestimonialSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            if (!isPaused) {
                setCurrentIndex(prevIndex =>
                    prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
                );
            }
        }, 5000);
    };

    useEffect(() => {
        resetTimer();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaused]);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
        );
        resetTimer();
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
        );
        resetTimer();
    };

    const goToSlide = (slideIndex) => {
        setCurrentIndex(slideIndex);
        resetTimer();
    };

    return (
        <section id="testimonials" className="py-16 bg-[var(--color-background)]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-3 font-sans">
                        What Our Clients Say
                    </h2>
                    <div className="w-20 h-1 bg-[var(--color-golden)] mx-auto rounded-full"></div>
                </div>

                <div className="relative"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}>
                    
                    {/* Slider container - maintaining exact same dimensions */}
                    <div className="overflow-hidden rounded-2xl shadow-2xl">
                        <div className="relative">
                            <div
                                className="bg-[var(--color-text)] p-6 rounded-lg transition-all duration-500 border-l-4 border-[var(--color-golden)] min-h-[300px] flex flex-col justify-between"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div className="flex mb-2">
                                        {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                                            <Star key={i} className="h-6 w-6 text-[var(--color-golden)] fill-current mx-0.5" />
                                        ))}
                                    </div>
                                    <div className="h-1 w-16 bg-[var(--color-golden)] rounded-full mb-4"></div>

                                    <blockquote className="text-gray-800 text-lg md:text-xl mb-6 italic font-light leading-relaxed font-serif px-4">
                                        &ldquo;{testimonials[currentIndex].content}&rdquo;
                                    </blockquote>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="h-12 w-12 bg-[var(--color-golden)] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md mb-3">
                                        {testimonials[currentIndex].name.charAt(0)}
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-lg text-gray-900 font-sans">{testimonials[currentIndex].name}</p>
                                        <p className="text-blue-600 text-sm font-bold">{testimonials[currentIndex].role}</p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                                    <div
                                        className="h-full bg-[var(--color-golden)] transition-all duration-300 ease-linear"
                                        style={{
                                            width: `${((currentIndex + 1) / testimonials.length) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation buttons */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-10 md:-ml-16 bg-white p-2 rounded-full shadow-lg text-[var(--color-golden)] hover:bg-gray-50 focus:outline-none z-10 transition-all duration-300 transform hover:scale-110"
                        aria-label="Previous testimonial"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-10 md:-mr-16 bg-white p-2 rounded-full shadow-lg text-[var(--color-golden)] hover:bg-gray-50 focus:outline-none z-10 transition-all duration-300 transform hover:scale-110"
                        aria-label="Next testimonial"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Slide indicators */}
                    <div className="flex justify-center mt-6">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-2 h-2 mx-1 rounded-full transition-all duration-300 focus:outline-none ${
                                    index === currentIndex ? 'bg-[var(--color-golden)] w-4' : 'bg-gray-300'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialSlider;