//  const About = () => {
//     return (
//       <section id="about" className="py-15 bg-gradient-to-br from-[var(--color-golden)] to-[var(--color-muted-gold)]">
//         <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
//           <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center overflow-hidden">About Us</h2>
//           <p className="text-lg text-black/80 text-center">
//             We are dedicated to transforming credit risk assessment through AI-driven solutions. Traditional methods often fall short in accurately predicting borrower risk, leading to financial uncertainties. Our advanced technology leverages historical data and behavioral insights to provide precise, real-time evaluations, helping financial institutions make informed decisions, reduce defaults, and optimize lending strategies. By empowering smarter credit analysis, we aim to drive financial stability and economic growth.
//           </p>
//         </div>
//       </section>
//     );
//   };
  
//   export default About;
  

// About component - Add this to your project
const About = () => {
  return (
    <section id="about-us" className="py-15 bg-[var(--color-golden)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8 text-center">About Us</h2>
        <div className="text-left font-poppins text-lg leading-relaxed">
          <p>
            We are dedicated to transforming credit risk assessment through AI-driven solutions. 
            Traditional methods often fall short in accurately predicting borrower risk, leading 
            to financial uncertainties. Our advanced technology leverages historical data and 
            behavioral insights to provide precise, real-time evaluations, helping financial 
            institutions make informed decisions, reduce defaults, and optimize lending strategies. 
            By empowering smarter credit analysis, we aim to drive financial stability and economic growth.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;