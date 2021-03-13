import Colors from '../../helpers/colors'

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
          border: none;
          height: 15px;
          border-radius: 0;
          cursor: pointer;
        }

        .threshold .slider::-webkit-slider-thumb {
          background: ${Colors.Green};
          width: 5px;
          -webkit-clip-path: polygon(0% 20%, 50% 0%, 100% 20%, 100% 100%, 0% 100%);
        }

        .gain .slider::-webkit-slider-thumb {
          background-color: ${Colors.Orange};
          width: 20px;
          -webkit-clip-path: polygon(0% 0%, 80% 0%, 100% 40%, 100% 60%, 80% 100%, 0% 100%);
        }

        .slider::-moz-range-thumb {
          -moz-appearance: none; /* Override default look */
          appearance: none;
          border: none;
          height: 15px;
          border-radius: 0;
          cursor: pointer;
        }

        .threshold .slider::-moz-range-thumb {
          background-color: ${Colors.Green};
          width: 5px;
          clip-path: polygon(0% 20%, 50% 0%, 100% 20%, 100% 100%, 0% 100%);
        }

        .gain .slider::-moz-range-thumb {
          background-color: ${Colors.Orange};
          width: 20px;
          height: 15px;
          clip-path: polygon(0% 0%, 80% 0%, 100% 40%, 100% 60%, 80% 100%, 0% 100%);
        }
      `}</style>
    </div>
  )
}
export default Dragbar
