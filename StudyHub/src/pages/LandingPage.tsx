import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Timer, BarChart3, Users, Sparkles, Target, HeartHandshake, } from "lucide-react";
import logo from "../assets/images/StudyHub Logo.png";
import leftHero from "../assets/images/Yuppies Emails.png";
import rightHero from "../assets/images/Yuppies Super Idea.png";
import "../css/LandingPage.css";

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

function FeatureCard({ title, desc, icon, colorClass,}: { title: string; desc: string; icon: React.ReactNode; colorClass: string;}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.03 }}
      className={`studyhub-landing__feature-card ${colorClass}`}
    >
      <div className="studyhub-landing__icon-box">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="studyhub-landing">
      {/* Navbar */}
      <nav className="studyhub-landing__nav">
        <Link to="/" className="studyhub-landing__brand"> <img src={logo} alt="StudyHub+" className="studyhub-landing__logo" /> </Link>
        <div className="studyhub-landing__nav-links">
          <a href="#features">Features</a>
          <a href="#why">Why StudyHub+</a>
          <a href="#contact">Contact</a>
          <Link to="/" className="studyhub-landing__ghost-btn"> Login </Link>
          <Link to="/register" className="studyhub-landing__cta"> Get Started </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="studyhub-landing__hero">
        <motion.img
          initial={{ y: 0 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          src={leftHero}
          alt="Illustration left"
          className="studyhub-landing__hero-illust-left"
        />
        <motion.img
          initial={{ y: 0 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
          src={rightHero}
          alt="Illustration right"
          className="studyhub-landing__hero-illust-right"
        />

        <motion.div
          className="studyhub-landing__hero-inner"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h1 variants={fadeUp}>
            Build better habits with <span className="studyhub-landing__highlight">StudyHub+</span>
          </motion.h1>
          <motion.p variants={fadeUp}>
            Stay focused, track your progress, and grow together — one session
            at a time.
          </motion.p>
          <motion.div variants={fadeUp} className="studyhub-landing__hero-cta">
            <Link to="/register" className="studyhub-landing__cta"> Start Now</Link>
            <a href="#features" className="studyhub-landing__ghost-btn"> Explore Features</a>
          </motion.div>
        </motion.div>
      </header>

      {/* Features */}
      <section id="features" className="studyhub-landing__features">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp}>
            Our <span className="studyhub-landing__highlight">interactive</span>{" "}
            features
          </motion.h2>

          <div className="studyhub-landing__grid">
            <FeatureCard
              title="Dashboard"
              desc="Visualize goals, streaks, and weekly progress."
              icon={<BarChart3 size={60} color="#7E6AD6" />}
              colorClass="card-purple"
            />
            <FeatureCard
              title="Focus Timer"
              desc="Stay productive with sessions and smart breaks."
              icon={<Timer size={60} color="#2E7D32" />}
              colorClass="card-green"
            />
            <FeatureCard
              title="Group Challenges"
              desc="Join friends, stay accountable, and celebrate wins."
              icon={<Users size={60} color="#FFE066" />}
              colorClass="card-yellow"
            />
          </div>
        </motion.div>
      </section>

      {/* Why StudyHub+ */}
      <section id="why" className="studyhub-landing__why">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp}>Why <span className="studyhub-landing__highlight">StudyHub+</span>{" "}?</motion.h2>
          <motion.p variants={fadeUp}>
            Because learning should feel empowering — not overwhelming.
          </motion.p>

          <div className="studyhub-landing__why-grid">
            <motion.div variants={fadeUp} className="studyhub-landing__why-card">
              <Sparkles size={54} color="#7E6AD6" />
              <h3>Stay Motivated</h3>
              <p>
                Earn streaks and visualize your progress with every study
                session.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="studyhub-landing__why-card">
              <Target size={54} color="#2E7D32" />
              <h3>Track Your Focus</h3>
              <p>
                Measure productivity and build strong study habits that last.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="studyhub-landing__why-card">
              <HeartHandshake size={54} color="#FFE066" />
              <h3>Grow Together</h3>
              <p>
                Connect with others, share goals, and stay accountable as a
                person.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="studyhub-landing__footer">
        <div className="studyhub-landing__footer-inner">
          <img src={logo} alt="StudyHub+" className="studyhub-landing__logo footer" />
          <p className="studyhub-landing__footer-text"> Build better habits. Stay on track. Reach your goals. </p>
          <div className="studyhub-landing__footer-links">
            <a href="#">Twitter</a>
            <a href="#">Instagram</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
