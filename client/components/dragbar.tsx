import { createRef, useState } from 'react'

type DragbarProps = {
  initialValue: number
  onChange: (p: number) => void
}

const Dragbar = ({ initialValue, onChange }: DragbarProps) => {

  return (
    <div className='dragbar'>
      <input type='range' min='1' max='100' value={initialValue} className='slider' onChange={(e) => onChange(parseInt(e.currentTarget.value))} />
      <style jsx>{`
        .slider {
          -webkit-appearance: none; /* Override default CSS styles */
          appearance: none;
          width: 100%;
          height: 5px;
          background: #d3d3d3;
          outline: none;
          opacity: 0.7;
          -webkit-transition: 0.2s; /* 0.2 seconds transition on hover */
          transition: opacity 0.2s;
        }

        .slider:hover {
          opacity: 1;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none; /* Override default look */
          appearance: none;
          width: 5px; /* Set a specific slider handle width */
          height: 15px; /* Slider handle height */
          background: #4caf50; /* Green background */
          cursor: pointer; /* Cursor on hover */
        }

        .slider::-moz-range-thumb {
          width: 5px; /* Set a specific slider handle width */
          height: 15px; /* Slider handle height */
          background: #4caf50; /* Green background */
          cursor: pointer; /* Cursor on hover */
        }
      `}</style>
    </div>
  )
}
export default Dragbar
