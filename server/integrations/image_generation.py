"""
Multi-provider Image Generation Service (Imagen + DALL-E)
"""
import os
from typing import Optional, List
from dataclasses import dataclass
from enum import Enum


class ImageProvider(Enum):
    """Supported image generation providers"""
    IMAGEN = "imagen"
    DALLE = "dalle"


@dataclass
class GeneratedImage:
    """Result from image generation"""
    url: str
    provider: ImageProvider
    prompt: str
    revised_prompt: Optional[str] = None


class ImageGenerationService:
    """Multi-provider image generation with fallback"""

    def __init__(
        self,
        google_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None
    ):
        self.google_api_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

    async def generate_with_imagen(
        self,
        prompt: str,
        num_images: int = 1,
        aspect_ratio: str = "1:1"
    ) -> List[GeneratedImage]:
        """Generate images with Google Imagen 3"""
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.google_api_key)

            # Note: Using the correct Imagen API
            model = genai.ImageGenerationModel("imagen-3.0-generate-001")

            response = await model.generate_images_async(
                prompt=prompt,
                number_of_images=num_images,
                aspect_ratio=aspect_ratio,
                safety_filter_level="block_medium_and_above"
            )

            return [
                GeneratedImage(
                    url=img.url if hasattr(img, 'url') else str(img),
                    provider=ImageProvider.IMAGEN,
                    prompt=prompt
                )
                for img in response.images
            ]
        except Exception as e:
            raise Exception(f"Imagen API error: {str(e)}")

    async def generate_with_dalle(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> GeneratedImage:
        """Generate images with DALL-E 3"""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.openai_api_key)

            response = await client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=quality,
                n=1
            )

            return GeneratedImage(
                url=response.data[0].url,
                provider=ImageProvider.DALLE,
                prompt=prompt,
                revised_prompt=response.data[0].revised_prompt
            )
        except Exception as e:
            raise Exception(f"DALL-E API error: {str(e)}")

    async def generate(
        self,
        prompt: str,
        preferred_provider: ImageProvider = ImageProvider.IMAGEN,
        **kwargs
    ) -> List[GeneratedImage]:
        """Generate with automatic fallback support"""
        try:
            if preferred_provider == ImageProvider.IMAGEN:
                return await self.generate_with_imagen(prompt, **kwargs)
            else:
                return [await self.generate_with_dalle(prompt, **kwargs)]
        except Exception as e:
            # Fallback to other provider
            if preferred_provider == ImageProvider.IMAGEN:
                try:
                    return [await self.generate_with_dalle(prompt)]
                except:
                    raise e
            else:
                try:
                    return await self.generate_with_imagen(prompt)
                except:
                    raise e
