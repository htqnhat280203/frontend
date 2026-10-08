import Image from "next/image";
import logoImage from "@/assets/images/cochunhomarket.png";

type BrandMarkProps = {
  size?: number;
};

export default function BrandMark({ size = 44 }: BrandMarkProps) {
  return (
    <Image
      src={logoImage}
      alt="Hương Anh Tạp Hóa"
      width={size}
      height={size}
      priority
      className="shrink-0 rounded-xl border border-[#CFAE91] bg-[#FAF2E0] object-cover"
    />
  );
}
