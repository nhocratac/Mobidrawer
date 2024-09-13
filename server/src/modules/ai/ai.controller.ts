import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import fetch from 'node-fetch';

// @Controller('ai')
// export class AiController {
//     @Get()
//     async getImage(@Res() res: Response): Promise<void> {
//       try {
//         const resp = await fetch(
//           `https://api.limewire.com/api/image/generation`,
//           {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               'X-Api-Version': 'v1',
//               Accept: 'application/json',
//               Authorization: 'Bearer KEY_HERE',
//             },
//             body: JSON.stringify({
//               prompt: 'A cute baby dog',
//               aspect_ratio: '1:1',
//             }),
//           }
//         );
    
//         if (!resp.ok) {
//           throw new Error(`Failed to generate image. Status: ${resp.status}`);
//         }
    
//         // Get the JSON response
//         const data = await resp.json();
//         console.log(data.status);
//         console.log(data.body);

//         console.log('assets url' + data.data[0].asset_url);
//         const assetUrl = data.data[0].asset_url; // Get the asset URL from the response
    
//         // Send the URL back to the client
//         res.status(200).json({ imageUrl: assetUrl });
//       } catch (error) {
//         console.error('Error retrieving image:', error);
//         res.status(500).send('Error retrieving image');
//       }
//     }
    
// }

@Controller('ai')
export class AiController {
    @Get('generation')
    async getImage(@Res() res: Response): Promise<void> {
        const assetUrl = 'http://localhost:4000/test.png';     
        res.status(200).json({ imageUrl: assetUrl });    
      
    }

   
    @Post('inPaint')
    async getImageInPaint(
        @Res() res: Response,
        @Body() body: { image:string,maskString:string , prompt:string } // Assuming the body contains a field 'image'
    ): Promise<void> {
        // Log the data received from the client
        console.log('Received data from client:', body);
        const resp = await fetch('https://api.limewire.com/api/image/inpainting',{
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Version': 'v1',
              Accept: 'application/json',
              Authorization: 'Bearer <YOUR_lmwr_sk_*_HERE>'
            },
            body: JSON.stringify({
              image_asset_id: '116a972f-666a-44a1-a3df-c9c28a1f56c0',
              prompt: 'A cute baby sloth'
            })
        })
        const data = await resp.json();
        console.log("Inpainting response: " + data);
        // For demonstration, responding with a static image URL
        res.status(200).json({ imageUrl: "http://localhost:4000/path/to/processed/image.png" });
    }
    
}