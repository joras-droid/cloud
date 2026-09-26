import { requireAdmin } from "@/lib/auth/session";
import {
  getAdminSettingsRow,
  getAdminZones,
} from "@/server/queries/admin-orders";
import { saveSettings, saveZone } from "@/server/actions/content";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { paisaToRupees } from "@/lib/money";
import type { OpenHour, QrMethod } from "@/server/queries/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SettingsPage() {
  await requireAdmin("owner");
  const settings = await getAdminSettingsRow();
  const zones = await getAdminZones();
  if (!settings) {
    return <p>Settings are missing. Re-run the seed.</p>;
  }

  const hours = settings.openHours as OpenHour[];
  const qr = settings.qrImages as QrMethod[];

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-ink-soft">
          Hours, delivery areas, COD rules, and the QR the customer scans.
        </p>
      </header>

      <form action={saveSettings} className="grid gap-6">
        <section className="grid gap-3 rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-lg font-bold">Kitchen</h2>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isAcceptingOrders"
              defaultChecked={settings.isAcceptingOrders}
              className="size-4 accent-brand-600"
            />
            Kitchen open
          </label>
          <p className="text-sm text-ink-soft">
            This is the same switch as the bar at the top of admin. Open means
            customers can place orders right now. Closed pauses new orders.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="minOrder">Minimum order (Rs)</Label>
              <Input
                id="minOrder"
                name="minOrder"
                type="number"
                defaultValue={paisaToRupees(settings.minOrder)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="supportPhone">Support phone</Label>
              <Input
                id="supportPhone"
                name="supportPhone"
                defaultValue={settings.supportPhone ?? ""}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bannerEn">Banner (English)</Label>
              <Input
                id="bannerEn"
                name="bannerEn"
                defaultValue={settings.bannerEn ?? ""}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bannerNe">Banner (Nepali)</Label>
              <Input
                id="bannerNe"
                name="bannerNe"
                defaultValue={settings.bannerNe ?? ""}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-lg font-bold">Hours (Kathmandu)</h2>
          <HoursEditor hours={hours} />
        </section>

        <section className="grid gap-3 rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-lg font-bold">Cash on delivery</h2>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="codEnabled"
              defaultChecked={settings.codEnabled}
              className="size-4 accent-brand-600"
            />
            Allow COD
          </label>
          <div>
            <Label htmlFor="codMax">COD cap (Rs)</Label>
            <Input
              id="codMax"
              name="codMax"
              type="number"
              defaultValue={paisaToRupees(settings.codMax)}
              className="mt-1.5"
            />
          </div>
        </section>

        <section className="grid gap-3 rounded-card border border-line bg-paper p-5">
          <h2 className="font-display text-lg font-bold">Payment QR</h2>
          <p className="text-sm text-ink-soft">
            Edit as JSON for now: method, accountName, image URL.
          </p>
          <textarea
            name="qrImages"
            rows={8}
            defaultValue={JSON.stringify(qr, null, 2)}
            className="focus-ring w-full rounded-xl border border-line p-3 font-mono text-sm"
          />
        </section>

        <Button type="submit" size="lg">
          Save settings
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-bold">Delivery areas</h2>
        <ul className="mb-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
          {zones.map((zone) => (
            <li key={zone.id} className="p-4">
              <form action={saveZone} className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={zone.id} />
                <div>
                  <Label>English</Label>
                  <Input name="nameEn" defaultValue={zone.nameEn} className="mt-1.5" />
                </div>
                <div>
                  <Label>Nepali</Label>
                  <Input name="nameNe" defaultValue={zone.nameNe ?? ""} className="mt-1.5" />
                </div>
                <div>
                  <Label>Fee Rs</Label>
                  <Input
                    name="fee"
                    type="number"
                    defaultValue={paisaToRupees(zone.fee)}
                    className="mt-1.5"
                  />
                </div>
                <label className="text-sm">
                  <input
                    type="checkbox"
                    name="codAllowed"
                    defaultChecked={zone.codAllowed}
                  />{" "}
                  COD
                </label>
                <label className="text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={zone.isActive} />{" "}
                  Active
                </label>
                <Button type="submit" size="sm" variant="outline" className="sm:col-span-5">
                  Save area
                </Button>
              </form>
            </li>
          ))}
        </ul>

        <form action={saveZone} className="grid max-w-xl gap-2 rounded-card border border-dashed border-line p-4">
          <h3 className="font-semibold">Add area</h3>
          <Input name="nameEn" placeholder="Kirtipur" required />
          <Input name="nameNe" placeholder="कीर्तिपुर" />
          <Input name="fee" type="number" placeholder="Fee in Rs" defaultValue={150} />
          <label className="text-sm">
            <input type="checkbox" name="codAllowed" defaultChecked /> COD allowed
          </label>
          <label className="text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Active
          </label>
          <Button type="submit" variant="outline">
            Add area
          </Button>
        </form>
      </section>
    </div>
  );
}

function HoursEditor({ hours }: { hours: OpenHour[] }) {
  const byDay = DAYS.map((_, day) => hours.find((h) => h.day === day) ?? {
    day,
    open: "10:00",
    close: "21:00",
    closed: false,
  });

  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink-soft">
        Listed hours are a note for the kitchen. They do not block orders.
        Use the kitchen open/close switch for that.
      </p>
      <textarea
        name="openHours"
        rows={10}
        defaultValue={JSON.stringify(byDay, null, 2)}
        className="focus-ring w-full rounded-xl border border-line p-3 font-mono text-sm"
      />
    </div>
  );
}
