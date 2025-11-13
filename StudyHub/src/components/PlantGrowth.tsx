import { useEffect, useState } from "react";
import seed from "../assets/plants/seed2.png";
import sprout from "../assets/plants/sprout2.png";
import halfgrown from "../assets/plants/halfgrown2.png";
import fullgrown from "../assets/plants/fullgrown2.png";
import "../css/Plant.css";

interface PlantGrowthProps {
  growthValue: number; // Backend summary
}

export default function PlantGrowth({ growthValue }: PlantGrowthProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 1500);
    return () => clearTimeout(timer);
  }, [growthValue]);

  // Plant image
  let plantImage = seed;
  if (growthValue >= 1.0) plantImage = fullgrown;
  else if (growthValue >= 0.66) plantImage = halfgrown;
  else if (growthValue >= 0.33) plantImage = sprout;
  else plantImage = seed;

  // 🌿 Convert growth value to percentage (0–100)
  //const percentage = Math.round(growthValue * 100);
  //let message = "Start your focus journey 🌱";
  //if (growthValue >= 1.0) message = "🌳 Perfect Focus! You fully grew today’s plant!";
  //else if (growthValue >= 0.75) message = "🌿 Great Consistency! Stay in the flow!";
  //else if (growthValue >= 0.5) message = "🌱 You’re growing strong — keep going!";
  //else if (growthValue > 0) message = "🌰 Nice start! Build your focus roots!";
  
  return (
    <div className="plant-growth-section">
      <div className={`plant-image-wrapper ${animate ? "growing" : ""}`}>
        <img src={plantImage} alt="Plant Growth" className="plant-stage" />
      </div>
       {/* <p className="growth-percent">{percentage}% Growth</p> */}
       {/* <p className="growth-message">{message}</p> */}
    </div>
  );
}
