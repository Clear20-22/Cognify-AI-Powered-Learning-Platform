import React, { useState, useEffect } from "react";

const Avatar = ({
  src,
  alt,
  size = "w-8 h-8",
  fallbackText,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const showFallback = !src || imageError || !imageLoaded;

  return (
    <div className={`relative ${size} ${className}`}>
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          className={`${size} rounded-full object-cover transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}

      {showFallback && (
        <div
          className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold ${
            size.includes("w-8") ? "text-sm" : "text-xs"
          } absolute inset-0`}
        >
          {fallbackText}
        </div>
      )}
    </div>
  );
};

export default Avatar;
