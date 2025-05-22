import { Button } from '@/components/ui/button'
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore'
import { useBoardStoreof } from '@/lib/Zustand/store'
import { handleExportMobidrawerFile, handleImportMobidrawerFile, handleSaveAsImage, handleSaveAsPDF } from '@/lib/utils'
import { useState } from 'react'

export default function TopLeftBar() {
    const [showFileMenu, setShowFileMenu] = useState(false)

    const toggleFileMenu = () => {
        setShowFileMenu(prev => !prev)
    }
    return (
        <div className='relative'>
            <div className='fixed top-6 left-10 z-50 p-2 rounded-full bg-white'>
                <div className='flex gap-4 relative'>
                    <div className='relative'>
                        <Button
                            variant='outline'
                            onClick={toggleFileMenu}
                            className='rounded-full h-10 mr-2 hover:bg-slate-400 text-xl'
                        >
                            File
                        </Button>
                        {showFileMenu && <DropDownMenuFile />}
                    </div>
                    <Button variant='outline' className='rounded-full h-10 mr-2 hover:bg-slate-400 text-xl'>
                        Setting
                    </Button>
                    <Button variant='outline' className='rounded-full h-10 mr-2 hover:bg-slate-400 text-xl'>
                        Info
                    </Button>
                </div>
            </div>
        </div>
    )
}

function DropDownMenuFile() {
    const [showSaveMenu, setShowSaveMenu] = useState(false)
    const toggleSaveMenu = () => {
        setShowSaveMenu(prev => !prev)
    }
    return (
        <div className='absolute top-12 left-0 w-32 bg-white shadow-lg rounded-md border border-gray-200 z-50'>
            <div className='flex flex-col'>
                <Button variant='ghost' className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2'>New</Button>
                <Button
                    variant='ghost'
                    className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2'
                >
                    <label htmlFor="import-file" className="cursor-pointer w-full text-left">
                        Import
                    </label>
                    <input
                        id="import-file"
                        type="file"
                        accept=".mobi"
                        className="hidden"
                        onChange={handleImportMobidrawerFile}
                    />
                </Button>
                <div className='relative'>
                    <Button variant='ghost' className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2' onClick={toggleSaveMenu}>
                        Export
                    </Button>
                    {showSaveMenu && <SaveOtionMenu />}
                </div>
            </div>
        </div>
    )
}

function SaveOtionMenu() {
    return (
        <div className='absolute top-0 left-[8rem] w-32 bg-white shadow-lg rounded-md border border-gray-200 z-50'>
            <div className='flex flex-col'>
                <Button variant='ghost' className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2'
                    onClick={handleSaveAsPDF}>
                    PDF
                </Button>
                <Button variant='ghost' className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2'
                    onClick={handleSaveAsImage}>
                    IMAGE
                </Button>
                <Button variant='ghost' className='justify-start p-2 hover:bg-gray-100 text-xl border-b-2'
                    onClick={handleExportMobidrawerFile}>
                    .mobi File
                </Button>
            </div>
        </div>
    )
}
