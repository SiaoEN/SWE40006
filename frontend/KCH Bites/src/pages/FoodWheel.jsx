import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import "../styles/FoodWheel.css";

const foods = [
  { label: "🍜 Noodles", color: "#FFB347" },
  { label: "🍔 Burger", color: "#FF7A00" },
  { label: "🍕 Pizza", color: "#FFD166" },
  { label: "🍣 Sushi", color: "#7BC67E" },
  { label: "🥗 Salad", color: "#2EC4B6" },
  { label: "🍗 Chicken", color: "#E76F51" },
];

export default function FoodWheel() {
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState("");
  const [spinning, setSpinning] = useState(false);
  const segmentAngle = 360 / foods.length;

  const spinWheel = () => {
    if (spinning) return;

    const randomIndex = Math.floor(Math.random() * foods.length);
    const targetAngle = randomIndex * segmentAngle + segmentAngle / 2;
    const currentRotation = rotation % 360;
    const spins = 5; // full spins before landing
    const delta = 360 * spins + ((360 - ((currentRotation + targetAngle) % 360)) % 360);
    const angle = rotation + delta;

    setRotation(angle);
    setSelected("");
    setSpinning(true);

    window.setTimeout(() => {
      setSpinning(false);
      setSelected(foods[randomIndex].label);
    }, 3200);
  };

  // Trigger confetti celebration when result is displayed
  useEffect(() => {
    if (selected && !spinning) {
      // Trigger confetti with multiple bursts
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
          })
        );
      }, 25);
    }
  }, [selected, spinning]);

  const gradientStops = foods
    .map((food, index) => {
      const start = (index / foods.length) * 100;
      const end = ((index + 1) / foods.length) * 100;
      return `${food.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <>
      {!open && (
        <button className="floating-btn" onClick={() => setOpen(true)} aria-label="Open food wheel">
          <span>🍽</span>
          <small>Spin</small>
        </button>
      )}

      {open && (
        <div className="wheel-overlay" role="dialog" aria-modal="true" aria-label="Food spin wheel">
          <div className="wheel-container">
            <button className="close-btn" onClick={() => setOpen(false)} aria-label="Close wheel">
              ✕
            </button>

            <div className="wheel-header">
              <p className="wheel-kicker">KCH Bites Lucky Pick</p>
              <h2>What should you eat?</h2>
              <p className="wheel-subtitle">Tap spin and let the wheel choose your next meal.</p>
            </div>

            <div className="wheel-stage">
              <div className="pointer" aria-hidden="true">▼</div>

              <div className="wheel-shell">
                <div
                  className="wheel"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(${gradientStops})`,
                  }}
                >
                  {foods.map((food, i) => (
                    <div
                      key={food.label}
                      className="slice"
                      style={{
                        transform: `rotate(${i * segmentAngle}deg)`,
                      }}
                    >
                      <span
                        className="slice-label"
                        style={{
                          "--slice-angle": `${segmentAngle / 2}deg`,
                          "--label-distance": `clamp(72px, 16vw, 108px)`,
                        }}
                      >
                        <span className="slice-label-text">{food.label}</span>
                      </span>
                    </div>
                  ))}

                  <div className="wheel-core">
                    <span className="wheel-core-icon">🍽</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wheel-actions">
              <button className="spin-btn" onClick={spinWheel} disabled={spinning}>
                {spinning ? "Spinning..." : "Spin the Wheel"}
              </button>
            </div>
          </div>

          {selected && (
            <div className="result-modal-overlay" onClick={() => setSelected("")}>
              <div className="result-modal" onClick={(e) => e.stopPropagation()}>
                <div className="result-modal-content">
                  <div className="result-emoji">{selected.split(" ")[0]}</div>
                  <h3>You Got!</h3>
                  <p className="result-food">{selected}</p>
                  <button 
                    className="result-close-btn" 
                    onClick={() => setSelected("")}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}