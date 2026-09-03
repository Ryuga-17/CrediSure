import { Brain, LineChart, Lock, Database } from 'lucide-react';

const features = [
  {
    icon: <Brain className="h-8 w-8 text-[var(--color-primary)]" />,
    title: "Data-Driven Risk Assessment",
    description: "Advanced machine learning algorithms analyze financial data to provide accurate risk predictions."
  },
  {
    icon: <LineChart className="h-8 w-8 text-[var(--color-primary)]" />,
    title: "Risk Scoring Model",
    description: "Generate easy-to-interpret creditworthiness scores based on comprehensive analysis."
  },
  {
    icon: <Database className="h-8 w-8 text-[var(--color-primary)]" />,
    title: "Explainable AI",
    description: "Understand the factors influencing risk scores with our transparent AI model."
  },
  {
    icon: <Lock className="h-8 w-8 text-[var(--color-primary)]" />,
    title: "Regulatory Compliance",
    description: "Built-in compliance with data privacy and lending regulations for peace of mind."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-16 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-2 text-center text-white overflow-hidden">
          Key Features
        </h2>
        <div className="w-20 h-1 bg-[var(--color-golden)] mx-auto mb-10 rounded-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 bg-gradient-to-br from-[var(--color-golden)] to-[var(--color-muted-gold)]/80 hover:scale-105 hover:bg-[var(--color-golden)]/70 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-black/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;