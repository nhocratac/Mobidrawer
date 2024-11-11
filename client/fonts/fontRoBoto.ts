import { Roboto } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin','vietnamese'], // Danh sách các subsets
  weight: ['100' ,'300', '400','500', '700'], // Trọng số bạn muốn sử dụng
});

export default roboto;
