"use client";
import { Component, ReactNode, Suspense } from "react";
// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="relative w-full h-full">

          {/* Main Content */}
          <div className="relative w-full h-full p-4 z-10">{children}</div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default Layout;
