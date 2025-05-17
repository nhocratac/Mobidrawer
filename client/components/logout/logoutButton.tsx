"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  onLogout?: () => Promise<void> | void
}

export function LogoutButton({
  variant = "outline",
  size = "default",
}: LogoutButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={isLoading}>
        {size === "icon" ? (
          <LogOut className="h-4 w-4" />
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            {isLoading ? "Logging out..." : "Logout"}
          </>
        )}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>You will be redirected to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} disabled={isLoading}>
              {isLoading ? "Logging out..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}