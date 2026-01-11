"use client"

import React, { useState, useEffect, useRef } from 'react';
// import { motion } from 'framer-motion';
import * as THREE from 'three';
import { 
  User, 
  Lock, 
  Mail,  
  Cloud,
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 5) strength += 1;
    if (password.match(/[a-z]+/)) strength += 1;
    if (password.match(/[A-Z]+/)) strength += 1;
    if (password.match(/[0-9]+/)) strength += 1;
    if (password.match(/[$@#&!]+/)) strength += 1;
    return strength;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(
        `http://localhost:5000${endpoint}`,
        payload
      );

      if (isLogin) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect to dashboard or home page
        router.push('/dashboard');
      } else {
        // After successful registration, switch to login
        setIsLogin(true);
        setFormData({
          username: '',
          email: '',
          password: ''
        });
        alert('Registration successful! Please login.');
      }
    } 
    catch (err: unknown) {
      let errorMessage = 'An error occurred. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string; message?: string } } }).response;
        errorMessage = response?.data?.error || response?.data?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

    const submissionData = {
      ...formData
    };
    console.log('Submission Data:', submissionData);
  

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      alpha: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.background = new THREE.Color(0x000000);

    // Particles setup
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);
    const sizeArray = new Float32Array(particlesCount);

    for (let i = 0; i < particlesCount; i++) {
        // Spread particles more dynamically
        posArray[i*3] = (Math.random() - 0.5) * 200;     // x
        posArray[i*3+1] = (Math.random() - 0.5) * 200;   // y
        posArray[i*3+2] = (Math.random() - 0.5) * 100;   // z
  
        sizeArray[i] = Math.random() * 0.5 + 0.1; // Random size between 1 and 6
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0xD4AF37) }, 
          pointTexture: { value: new THREE.TextureLoader().load('/api/placeholder/10/10') }
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = vec3(1.0, 1.0, 1.0);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
             `,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec2 coords = gl_PointCoord - vec2(0.5);
          float dist = length(coords);
          float circle = 1.0 - smoothstep(0.4, 0.5, dist);
          
          gl_FragColor = vec4(color, circle * 0.7);
        }
      `,
      transparent: true,
      depthTest: false
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 1;

    const clock = new THREE.Clock();
    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

    particlesMesh.rotation.y = elapsedTime * 0.09;
    particlesMesh.rotation.x = elapsedTime * 0.09;

    const positions = particlesMesh.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(elapsedTime + positions[i]) * 0.01;
        positions[i+1] += Math.cos(elapsedTime + positions[i+1]) * 0.01;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    requestAnimationFrame(tick);
    };
    tick();

    const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
  
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
  
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        scene.remove(particlesMesh);
        particlesGeometry.dispose();
        particlesMaterial.dispose();
      };
    }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 relative overflow-hidden">
         {/* Three.js Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 z-0 w-full h-full"
      />
      
      <div className="bg-[#121212] backdrop-blur-lg shadow-2xl rounded-3xl w-full max-w-md p-8 space-y-6 border border-white/30 relative z-10">
        {/* Animated logo/header */}
        <div className="flex items-center justify-center mb-6">
          <Cloud className="text-[var(--color-golden)] w-12 h-12 mr-3 animate-bounce" />
          <h2 className="text-4xl font-bold text-[var(--color-golden)] tracking-tight">
            CrediSure
          </h2>
        </div>

        {/* Toggle switch */}
        <div className="flex justify-center mb-4">
          <div className="rounded-full p-1 flex items-center bg-[var(--color-muted-gold)]/10">
            <button 
              onClick={() => setIsLogin(true)}
              className={`px-4 py-2 rounded-full transition-colors ${
                isLogin 
                  ? 'bg-[var(--color-background)] text-[var(--color-golden)]' 
                  : 'text-white/30 hover:bg-[var(--color-muted-gold)]/30'
              }`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`px-4 py-2 rounded-full transition-colors ${
                !isLogin 
                  ? 'bg-[var(--color-background)] text-[var(--color-golden)]' 
                  : 'text-white/30 hover:bg-[var(--color-muted-gold)]/30'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-3 top-3 text-white/30 group-focus-within:text-[var(--color-golden)] transition-colors" />
              <input
                type="text"
                name="username"
                placeholder="Organization's Name"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 text-white/30 border-2 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-golden)] focus:border-transparent hover:bg-current transition-all"
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="relative group">
            <Mail className="absolute left-3 top-3 text-white/30 group-focus-within:text-[var(--color-golden)] transition-colors" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 text-white/30 border-2 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-golden)] focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div className="relative group">
            <Lock className="absolute left-3 top-3 text-white/30 group-focus-within:text-[var(--color-golden)] transition-colors" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 text-white/30 border-2 border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-muted-gold)] focus:border-transparent transition-all"
              required
            />
            {/* Password strength indicator */}
            <div className="mt-3 flex space-x-1">
              {[1,2].map((level) => (
                <div 
                  key={level} 
                  className={`h-1 w-full rounded-full transition-colors ${
                    level <= passwordStrength 
                      ? 'bg-[var(--color-golden)]'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error message display */}
          {error && (
            <div className="text-red-400 text-sm py-2">
              {error}
            </div>
          )}
       
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-[var(--color-muted-gold)]/30 text-white py-3 rounded-xl hover:bg-[var(--color-muted-gold)]/80 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl
            ${ isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
            <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
            </span>
            ) : isLogin ? 'Secure Login' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center">
          <p className="text-[var(--color-text)]">
            {isLogin 
              ? "Don't have an account? " 
              : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[var(--color-golden)] hover:underline font-semibold"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}