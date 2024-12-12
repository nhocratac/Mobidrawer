import React from "react";

enum sizeText {
    lagre = 'text-4xl',
    medium = 'text-2xl',
    small = 'text-xl',
}

interface TextGradientProps {
    children: React.ReactNode;
    size?: sizeText | undefined;
    [key: string]: unknown;
}

const Styles : { [key:string]:React.CSSProperties } = {
    textGradient: {
        background: "linear-gradient(90deg, #FF00CC 0%, #3333FF 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
}

export default function TextGradient({ children ,...props  }: TextGradientProps) {
  return (
    <p style={Styles.textGradient} {...props}>
      {children}
    </p>
  )
}
