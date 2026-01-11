"use client";
import HeroSection from '@/components/HeroSection';
import Features from '@/app/Features/page'
import AboutUs from '@/app/AboutUs/page'
import Testimonials from '@/app/Testimonials/page';
import React from 'react'

export default function Page() {
  return (
    <>
        <HeroSection/>
        <AboutUs/>
        <Features/> 
        <Testimonials/>     
    </>
  )
}
