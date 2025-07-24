import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-2 md:gap-0">
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1 md:mb-0">{title}</h1>
      {subtitle && <p className="text-gray-400 text-base font-medium">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex items-center gap-3 mt-2 md:mt-0">{actions}</div>
    )}
  </div>
);

export default PageHeader; 