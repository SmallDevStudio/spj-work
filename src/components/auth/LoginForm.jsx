"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import {
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { z } from "zod";

import { cn } from "@/lib/utils/cn";
import {
  signInWithEmergencyAccount,
  signInWithGoogleWorkspace,
} from "@/services/auth/client-auth.service";

const emergencyLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมล")
    .email("กรุณากรอกอีเมลให้ถูกต้อง")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

function getAuthenticationErrorMessage(error) {
  const errorMessages = {
    "auth/popup-closed-by-user": "ยกเลิกการเข้าสู่ระบบด้วย Google",
    "auth/popup-blocked":
      "Browser ปิดกั้นหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Popup",
    "auth/cancelled-popup-request": "มีหน้าต่างเข้าสู่ระบบเปิดอยู่แล้ว",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-disabled": "บัญชีนี้ถูกระงับการใช้งาน",
    "auth/too-many-requests":
      "เข้าสู่ระบบผิดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่",
    AUTH_WORKSPACE_DOMAIN_REQUIRED:
      "กรุณาใช้บัญชี Google Workspace @superjeew.com",
    AUTH_USER_NOT_FOUND: "ยังไม่มีบัญชีผู้ใช้นี้ในระบบ SPJ Work",
    AUTH_USER_INACTIVE: "บัญชีผู้ใช้นี้ไม่ได้เปิดใช้งาน",
    AUTH_MEMBERSHIP_NOT_FOUND: "บัญชีนี้ยังไม่ได้รับสิทธิ์ในบริษัท",
    AUTH_MEMBERSHIP_INACTIVE: "สิทธิ์การใช้งานในบริษัทถูกระงับ",
    AUTH_PROVIDER_NOT_ASSIGNED:
      "บัญชีนี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบด้วยวิธีนี้",
    AUTH_EMERGENCY_ACCESS_DENIED:
      "บัญชีนี้ไม่ได้รับสิทธิ์ Emergency SUPERADMIN",
    AUTH_INVALID_CSRF_TOKEN: "ข้อมูลความปลอดภัยหมดอายุ กรุณาลองใหม่",
    AUTH_ORIGIN_NOT_ALLOWED: "เว็บไซต์ต้นทางไม่ได้รับอนุญาต",
  };

  return (
    errorMessages[error?.code] ?? "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function LoginForm() {
  const router = useRouter();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emergencyLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isLoading = googleLoading || emergencyLoading;

  function redirectAfterLogin() {
    router.replace("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    if (isLoading) {
      return;
    }

    setFormError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogleWorkspace();
      redirectAfterLogin();
    } catch (error) {
      setFormError(getAuthenticationErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmergencyLogin(formData) {
    if (isLoading) {
      return;
    }

    setFormError("");
    setEmergencyLoading(true);

    try {
      await signInWithEmergencyAccount(formData);
      redirectAfterLogin();
    } catch (error) {
      setFormError(getAuthenticationErrorMessage(error));
    } finally {
      setEmergencyLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="mb-8">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
          <HiOutlineShieldCheck className="size-8" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          SPJ Work
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          เข้าสู่ระบบ
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          ใช้บัญชี Google Workspace ของ Superjeew เพื่อเข้าใช้งานระบบ
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
      >
        <FcGoogle className="size-5 shrink-0" aria-hidden="true" />

        {googleLoading
          ? "กำลังเข้าสู่ระบบ..."
          : "เข้าสู่ระบบด้วย Google Workspace"}
      </button>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />

        <span className="text-xs font-medium text-slate-400">หรือ</span>

        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <button
        type="button"
        onClick={() => {
          setShowEmergencyForm((currentValue) => !currentValue);
          setFormError("");
        }}
        disabled={isLoading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <HiLockClosed className="size-4" aria-hidden="true" />
        Emergency SUPERADMIN
      </button>

      {showEmergencyForm ? (
        <form
          onSubmit={handleSubmit(handleEmergencyLogin)}
          className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          noValidate
        >
          <div>
            <label
              htmlFor="emergency-email"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              อีเมลฉุกเฉิน
            </label>

            <input
              id="emergency-email"
              type="email"
              autoComplete="username"
              disabled={isLoading}
              {...register("email")}
              className={cn(
                "min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-white",
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                  : "border-slate-300 focus:border-amber-500 focus:ring-amber-100 dark:border-slate-700 dark:focus:ring-amber-950",
              )}
              placeholder="emergency@example.com"
            />

            {errors.email ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="emergency-password"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              รหัสผ่าน
            </label>

            <div className="relative">
              <input
                id="emergency-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLoading}
                {...register("password")}
                className={cn(
                  "min-h-11 w-full rounded-xl border bg-white py-2 pr-11 pl-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-white",
                  errors.password
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950"
                    : "border-slate-300 focus:border-amber-500 focus:ring-amber-100 dark:border-slate-700 dark:focus:ring-amber-950",
                )}
                placeholder="กรอกรหัสผ่าน"
              />

              <button
                type="button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                disabled={isLoading}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-white"
              >
                {showPassword ? (
                  <HiEyeSlash className="size-5" aria-hidden="true" />
                ) : (
                  <HiEye className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>

            {errors.password ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
          >
            {emergencyLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบฉุกเฉิน"}
          </button>
        </form>
      ) : null}

      <p className="mt-6 text-center text-xs leading-5 text-slate-400">
        ระบบสำหรับพนักงาน Superjeew Co., Ltd. เท่านั้น
      </p>
    </div>
  );
}
