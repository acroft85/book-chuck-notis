'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import AvailabilityCalendar, { type BusyPeriod } from './AvailabilityCalendar'
import BookingForm from './BookingForm'

interface Props {
  busyPeriods: BusyPeriod[]
  totalCrew: number
}

export default function BookingSection({ busyPeriods, totalCrew }: Props) {
  const [selectedDate, setSelectedDate] = useState('')

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setTimeout(() => {
      document.getElementById('book-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <>
      {/* Availability calendar */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#2B2B2B] mb-2">Check Availability</h2>
          <p className="text-gray-500">
            Browse crew availability over the next three months. Select a date to get started.
          </p>
        </div>
        <AvailabilityCalendar
          busyPeriods={busyPeriods}
          totalCrew={totalCrew}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      </div>

      {/* Booking form */}
      <div id="book-form">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#2B2B2B] mb-2">Request a Booking</h2>
          <p className="text-gray-500">
            Fill in the details below and we&apos;ll get back to you within one working day.
          </p>
          {selectedDate && (
            <p className="text-sm text-[#E8820C] font-medium mt-2">
              Start date pre-filled: {format(parseISO(selectedDate), 'd MMMM yyyy')}
            </p>
          )}
        </div>
        <BookingForm initialStartDate={selectedDate} />
      </div>
    </>
  )
}
