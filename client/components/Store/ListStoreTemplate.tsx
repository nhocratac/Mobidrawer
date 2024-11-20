import { svgs } from "@/assets"
import LiItem, { ItemProps } from "@/components/Store/Item"

const Images = [
  svgs.Store1,
  svgs.Store2,
  svgs.Store3,
  svgs.Store4,
]

const Owner = [
  {
    name: "SpaceX",
    logo: svgs.MiroLogo
  },
  {
    name: "team meta",
    logo: svgs.Owner1
  },
]

const names = [
  "sáng tạo",
  "mẫu thông minh",
  "chart card",
  "aws flow",
]

const infos = [
  {
    description: "The Falcon 9 is a partially reusable two-stage-to-orbit medium-lift launch vehicle designed and manufactured by SpaceX in the United States.",
    price: 1000000,
    rating: 4.5
  },
  {
    description: "Mẫu dễ sử dụng mạnh mẽ tạo các bảng thông minh, biểu đồ, sơ đồ và nhiều hơn nữa.",
    price: 500000,
    rating: 3.5
  },
  {
    description: "Mẫu thiết nhằm tạo ra các biểu đồ thông minh, dễ sử dụng và hiệu quả.",
    price: 300000,
    rating: 5.0
  },
  {
    description: "Chúng tôi thiết kế mẫu giúp bạn, hãy sử dụng. Tạo các biểu đồ mà bạn muốn. Nhận mức lương cao với mẫu này.",
    price: 1200000,
    rating: 4.5
  }
]



function ListStoreTemplate() {
  const generationData = (length: number) => {
    const data = []
    for (let i = 0; i < length; i++) {
      data.push({
        Image: Images[Math.floor(Math.random() * Images.length) % Images.length ],
        onwer: Owner[Math.floor(Math.random() * Owner.length) % Owner.length],
        name: names[Math.floor(Math.random() * Owner.length) % names.length],
        info: infos[Math.floor(Math.random() * infos.length) % infos.length]
      })
    }
    return data
  }
  const storeData = generationData(20)
  return (
    <ul className="grid grid-cols-4 gap-y-8 gap-x-24">
      {storeData.map((item, index) => (
        <LiItem key={index} {...item} />
      ))}
    </ul>
  )
}

export default ListStoreTemplate