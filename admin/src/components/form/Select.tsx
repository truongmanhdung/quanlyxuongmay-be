import React from "react";
import { Select as AntSelect } from "antd";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Chọn",
  onChange,
  className = "",
  defaultValue = "",
  value,
  allowClear = true,
  disabled,
}) => {
  return (
    <AntSelect
      className={`w-full ${className}`}
      style={{ height: 44, width: "100%" }}
      placeholder={placeholder}
      value={value !== undefined ? value || undefined : undefined}
      defaultValue={defaultValue || undefined}
      disabled={disabled}
      allowClear={allowClear}
      showSearch={{ optionFilterProp: "label" }}
      onChange={(val) => onChange((val as string) || "")}
      onClear={() => onChange("")}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
    />
  );
};

export default Select;
