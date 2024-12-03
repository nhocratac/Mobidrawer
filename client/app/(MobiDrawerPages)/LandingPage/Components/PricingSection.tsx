'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from "@/components/ui/button"

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
}

const plans = [
    { name: 'Basic', price: '$9', features: ['5 team members', '10 projects', 'Basic support', '1GB storage'] },
    { name: 'Pro', price: '$29', features: ['Unlimited team members', 'Unlimited projects', 'Priority support', 'Advanced analytics', '10GB storage'] },
    { name: 'Enterprise', price: 'Custom', features: ['All Pro features', 'Dedicated account manager', 'Custom integrations', 'On-premise deployment', 'Unlimited storage'] },
]

export default function PricingSection() {
    return (
        <section id="pricing" className="bg-gray-50 py-20">
            <div className="container mx-auto px-4 md:px-8 lg:px-12">
                <motion.h2
                    className="text-4xl md:text-4xl mb-4 text-center "
                    variants={fadeInUp}
                >
                    Giá cả
                </motion.h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="border rounded-lg p-6 flex flex-col bg-white"
                        >
                            <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                            <p className="text-4xl font-bold mb-6">{plan.price}<span className="text-sm font-normal">/month</span></p>
                            <ul className="mb-6 flex-grow">
                                {plan.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-center mb-2">
                                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button className="w-full">{plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}</Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}