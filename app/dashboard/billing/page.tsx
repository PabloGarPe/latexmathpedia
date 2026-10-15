"use client"

import { useState } from "react"
import { CreditCard, Gift, Heart, Zap } from "lucide-react"

import { PageContainer } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function DonationPage() {
  const [donationAmount, setDonationAmount] = useState("10")
  const [donationFrequency, setDonationFrequency] = useState("once")

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setDonationAmount(value)
  }

  return (
    <PageContainer>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Apoya a LatexMathpedia</h1>
        <p className="text-muted-foreground">
          Tu apoyo nos ayuda a seguir creando contenido educativo de calidad y mantener nuestros recursos accesibles para todos.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      
      <Card>
        <CardHeader>
          <CardTitle>Apoya en Ko-fi</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe 
            id='kofiframe' 
            src='https://ko-fi.com/latexmathpedia/?hidefeed=true&widget=true&embed=true&preview=true' 
            style={{border: 'none', width:'100%', padding:'4px', background:'#f9f9f9'}}
            height='712' 
            title='latexmathpedia'>
          </iframe>
        </CardContent>
      </Card>
      
      <div className="mt-8 p-6 bg-muted rounded-lg">
        <div className="flex items-start space-x-4">
          <Zap className="h-6 w-6 text-primary mt-1" />
          <div>
            <h3 className="font-medium">¿Por qué donar?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Con tu donación ayudas a que podamos seguir desarrollando contenido educativo de calidad, mejorando la plataforma y manteniendo los recursos accesibles para estudiantes de todo el mundo.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
