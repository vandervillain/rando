type DragbarProps = {
  className: string
  /** in percent, ie, 0.25 */
  initialValue: number
  onChange: (p: number) => void
}

const Dragbar = ({ className, initialValue, onChange }: DragbarProps) => {
  const getClassName = () => `dragbar ${className}`

  return (
    <div className={getClassName()}>
      <input type='range' min='0' max='100' value={initialValue * 100} className='slider' onChange={(e) => onChange(parseInt(e.currentTarget.value) / 100)} />
      <style jsx>{`
        .dragbar {
          min-height: 0;
          padding-bottom: 15px;
          margin: 0;
          line-height: 0px;
        }
        .dragbar input {
          margin: 0;
        }

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
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          cursor: pointer;
        }

        .threshold .slider::-webkit-slider-thumb {
          background: #4caf50;
          width: 5px;
          height: 15px;
          -webkit-clip-path: polygon(0 20%, 50% 0%, 100% 20%, 100% 100%, 0% 100%);
          clip-path: polygon(0 20%, 50% 0%, 100% 20%, 100% 100%, 0% 100%);
        }

        .gain .slider::-webkit-slider-thumb {
          background-color: #fc7303;
          width: 20px;
          height: 15px;
          -webkit-clip-path: polygon(0 0%, 80% 0%, 100% 40%, 100% 60%, 80% 100%, 0% 100%);
          clip-path: polygon(0 0%, 80% 0%, 100% 40%, 100% 60%, 80% 100%, 0% 100%);
        }
      `}</style>
    </div>
  )
}
export default Dragbar
