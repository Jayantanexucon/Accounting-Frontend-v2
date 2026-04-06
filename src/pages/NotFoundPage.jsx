import React, { useEffect, useRef, useState } from "react";

export default function NotFoundPage() {
  const ref = useRef(null);
  const particlesRef = useRef([]);
  const sparklesRef = useRef([]);
  const requestRef = useRef();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    setIsMobile(window.innerWidth < 768);

    const el = ref.current;

    const handleMouseMove = (e) => {
      if (isMobile) return;

      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 200 - 100;
      const y = ((e.clientY - rect.top) / rect.height) * 200 - 100;

      setMousePos({ x, y });
      el.style.setProperty("--swing-x", x.toFixed(2));
      el.style.setProperty("--swing-y", y.toFixed(2));

      // Create sparkles on mouse move
      createSparkles(e.clientX, e.clientY);
      // Create particles
      createParticles(e.clientX, e.clientY);
      // Create ripple effect
      createRipple(e.clientX, e.clientY);
    };

    // Animation loop for continuous effects
    const animate = () => {
      updateParticles();
      updateSparkles();
      requestRef.current = requestAnimationFrame(animate);
    };

    if (!isMobile) {
      el.addEventListener("mousemove", handleMouseMove);
      animate();
    }

    // Cleanup
    return () => {
      if (!isMobile) {
        el.removeEventListener("mousemove", handleMouseMove);
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isMobile]);

  // Create particle effect
  const createParticles = (x, y) => {
    const particleCount = 3;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";

      // Random properties
      const size = Math.random() * 4 + 2;
      const speedX = (Math.random() - 0.5) * 8;
      const speedY = (Math.random() - 0.5) * 8;
      const color = `hsl(${Math.random() * 60 + 180}, 100%, 70%)`;

      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.8;
        box-shadow: 0 0 10px ${color};
      `;

      document.body.appendChild(particle);

      particlesRef.current.push({
        el: particle,
        x,
        y,
        speedX,
        speedY,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
      });
    }
  };

  // Update particles
  const updateParticles = () => {
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life -= p.decay;
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.1; // Gravity

      p.el.style.transform = `translate(${p.speedX}px, ${p.speedY}px)`;
      p.el.style.opacity = p.life;

      if (p.life <= 0) {
        p.el.remove();
        return false;
      }
      return true;
    });
  };

  // Create sparkles
  const createSparkles = (x, y) => {
    const sparkleCount = 2;

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "sparkle";

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 40 + 20;
      const size = Math.random() * 6 + 3;

      sparkle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, #fff 30%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        opacity: 0.9;
      `;

      document.body.appendChild(sparkle);

      sparklesRef.current.push({
        el: sparkle,
        x,
        y,
        angle,
        distance,
        currentDistance: 0,
        life: 1,
        decay: 0.05,
      });
    }
  };

  // Update sparkles
  const updateSparkles = () => {
    sparklesRef.current = sparklesRef.current.filter((s) => {
      s.life -= s.decay;
      s.currentDistance += 5;

      const newX = s.x + Math.cos(s.angle) * s.currentDistance;
      const newY = s.y + Math.sin(s.angle) * s.currentDistance;

      s.el.style.left = `${newX}px`;
      s.el.style.top = `${newY}px`;
      s.el.style.opacity = s.life;
      s.el.style.transform = `scale(${s.life})`;

      if (s.life <= 0 || s.currentDistance > s.distance) {
        s.el.remove();
        return false;
      }
      return true;
    });
  };

  // Create ripple effect
  const createRipple = (x, y) => {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    ripple.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(100, 200, 255, 0.6);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999;
      transform: translate(-50%, -50%);
      animation: rippleExpand 0.8s ease-out forwards;
    `;

    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 800);
  };

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden perspective cursor-none"
      style={{
        "--swing-x": 0,
        "--swing-y": 0,
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-blue-500/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 100 + 20}px`,
              height: `${Math.random() * 100 + 20}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      {/* Glow effect under cursor */}
      <div
        className="fixed w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none z-50"
        style={{
          left: `calc(${mousePos.x * 0.5 + 50}% - 4rem)`,
          top: `calc(${mousePos.y * 0.5 + 50}% - 4rem)`,
          transform: `translate3d(
            calc(var(--swing-x) * -0.5px),
            calc(var(--swing-y) * -0.5px),
            0
          )`,
        }}
      />

      {/* Cyber grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(90deg, transparent 95%, rgba(100, 200, 255, 0.3) 100%),
            linear-gradient(0deg, transparent 95%, rgba(100, 200, 255, 0.3) 100%)
          `,
            backgroundSize: "50px 50px",
            transform: `perspective(500px) rotateX(calc(var(--swing-y) * 0.1deg)) rotateY(calc(var(--swing-x) * 0.1deg))`,
          }}
        />
      </div>

      {/* 404 Text with multiple layers */}
      <div className="relative">
        <h1 className="relative text-[clamp(5rem,40vmin,20rem)] font-extrabold tracking-[1rem] swing-text z-20">
          404
          <span className="absolute inset-0 swing-shadow">404</span>
          <span className="absolute inset-0 swing-glow">404</span>
        </h1>

        {/* Floating debris */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-blue-400/30 font-mono text-4xl pointer-events-none animate-float-debris"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 8 + 4}s`,
              transform: `translate3d(
                calc(var(--swing-x) * ${0.5 + i * 0.1}px),
                calc(var(--swing-y) * ${0.5 + i * 0.1}px),
                0
              )`,
            }}
          >
            {["?", "!", "#", "*", "%", "$", "@", "&"][i]}
          </div>
        ))}
      </div>


      {/* Styles */}
      <style jsx>{`
        .perspective {
          perspective: 1200px;
        }

        .swing-text {
          background: radial-gradient(ellipse at center, hsl(200, 100%, 95%) 0%, hsl(210, 100%, 70%) 30%, hsl(220, 100%, 50%) 60%, hsl(240, 100%, 20%) 100%);
          background-size: 300% 300%;
          background-position: calc(50% + (var(--swing-x) * 0.8) * 1%) calc(50% + (var(--swing-y) * 0.8) * 1%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: textGlow 4s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
        }

        .swing-shadow {
          color: transparent;
          background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.8) 0%, transparent 70%);
          background-clip: text;
          filter: blur(1.5vmin);
          transform: scale(1.05) translate3d(calc(var(--swing-x) * 0.08%), calc(var(--swing-y) * 0.08%), -20vmin);
          z-index: -1;
        }

        .swing-glow {
          color: transparent;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
          background-clip: text;
          filter: blur(2.5vmin);
          transform: scale(1.1) translate3d(calc(var(--swing-x) * 0.12%), calc(var(--swing-y) * 0.12%), -30vmin);
          z-index: -2;
          opacity: 0.7;
        }

        @keyframes textGlow {
          0%,
          100% {
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 30px rgba(147, 51, 234, 0.5));
          }
        }

        @keyframes rippleExpand {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes floatDebris {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(20px, -20px) rotate(180deg);
            opacity: 0.1;
          }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }

        .animate-float-debris {
          animation: floatDebris infinite ease-in-out;
        }

        /* Scan line effect */
        .perspective::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent);
          animation: scanLine 4s linear infinite;
          z-index: 10;
        }

        @keyframes scanLine {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }

        /* Custom cursor */
        .cursor-none {
          cursor: none;
        }

        .cursor-none:hover {
          cursor: none;
        }
      `}</style>
    </div>
  );
}
