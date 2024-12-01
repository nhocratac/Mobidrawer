'use client'
import LiItem from "@/components/Store/Item"
import { ItemProps } from '@/lib/Zustand/type.type'
import { useEffect, useState } from 'react'

const Images = [
  '../../assets/svg/store1.svg',
  '../../assets/svg/store2.svg',
  '../../assets/svg/store3.svg',
  '../../assets/svg/store4.svg',
  '../../assets/svg/store5.svg',
  '../../assets/svg/store6.svg',
  '../../assets/svg/store7.svg',
  '../../assets/svg/store8.svg',
  '../../assets/svg/store9.svg',
]

const Owner = [
  {
    name: "SpaceX",
    logo: '../../assets/svg/onwer1Logo.svg'
  },
  {
    name: "team meta",
    logo: '../../assets/svg/onwer2Logo.svg'
  },
  {
    name: 'google',
    logo: '../../assets/svg/miroLogo.svg'
  }
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
  },
  {
    description: "đừng ngần ngại khi sử dụng mẫu thiết kế này, nó sẽ giúp bạn tạo ra các biểu đồ thông minh và hiệu quả.",
    price: 1500000,
    rating: 4.0
  }
]

function ListStoreTemplate() {
  const [storeData, setStoreData] = useState<ItemProps[]>([]);
  useEffect(() => {
    const generationData = (length: number) => {
      const data: ItemProps[] = []
      for (let i = 0; i < length; i++) {
        data.push({
          id: i.toString(),
          ImageThumnail: Images[Math.floor(Math.random() * Images.length)],
          owner: Owner[Math.floor(Math.random() * Owner.length)],
          name: names[Math.floor(Math.random() * names.length)],
          info: infos[Math.floor(Math.random() * infos.length)],
        })
      }
      return data
    }
    setStoreData(generationData(20))
  }, [])

  return (
    <ul className="grid grid-cols-4 gap-y-8 gap-x-24">
      {storeData.map((item) => (
        <LiItem key={item.id} {...item} />
      ))}
    </ul>
  )
}

export default ListStoreTemplate
