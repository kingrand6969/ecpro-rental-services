import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, User, Mail, Phone, MapPin, CreditCard, History, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Customer, type Rental, type Car } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  idNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: customerRentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "rentals"],
    enabled: !!selectedCustomer,
  });

  const { data: cars } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const addForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      idNumber: "",
      notes: "",
    },
  });

  const editForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setAddCustomerOpen(false);
      addForm.reset();
      toast({ title: "Customer added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add customer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!selectedCustomer) return;
      const response = await apiRequest("PATCH", `/api/customers/${selectedCustomer.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditCustomerOpen(false);
      toast({ title: "Customer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update customer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(null);
      toast({ title: "Customer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete customer", variant: "destructive" });
    },
  });

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const getCarForRental = (rental: Rental) => {
    return cars?.find((c) => c.id === rental.carId);
  };

  const getTotalSpent = (customerId: number) => {
    if (!customerRentals || selectedCustomer?.id !== customerId) return null;
    return customerRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
  };

  const openEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      idNumber: customer.idNumber ?? "",
      notes: customer.notes ?? "",
    });
    setEditCustomerOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
          data-testid="text-customers-title"
        >
          Customers
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 font-mono text-sm"
              data-testid="input-customer-search"
            />
          </div>
          <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="button-add-customer"
                className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-mono text-base uppercase tracking-widest">Add New Customer</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 234 567 8900" data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">ID / Driver's License</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="DL12345678" data-testid="input-customer-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="123 Main St, City" data-testid="input-customer-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional notes..." data-testid="input-customer-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddCustomerOpen(false)}
                      className="font-mono text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                      data-testid="button-submit-customer"
                    >
                      {createMutation.isPending ? "Adding..." : "Add Customer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="glass-panel rounded-md p-4">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="glass-panel rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Contact</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">ID Number</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer border-border"
                        onClick={() => setSelectedCustomer(customer)}
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
                              <User className="h-4 w-4 text-neon-cyan" />
                            </div>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.idNumber ? (
                            <Badge variant="outline" className="font-mono">{customer.idNumber}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs uppercase tracking-wider"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCustomer(customer);
                              }}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="glass-panel rounded-md p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-neon-cyan" />
                </div>
                <h3 className="font-mono text-sm uppercase tracking-widest text-foreground mb-2">No customers yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first customer to start tracking rental history.
                </p>
                <Button
                  onClick={() => setAddCustomerOpen(true)}
                  className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            )}
          </div>

          <div>
            {selectedCustomer ? (
              <div className="glass-panel rounded-md">
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-mono text-sm uppercase tracking-widest text-foreground truncate">{selectedCustomer.name}</h2>
                      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">Customer Profile</p>
                    </div>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete customer ${selectedCustomer.name}`}
                            data-testid="button-delete-customer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete {selectedCustomer.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the customer and their
                              contact details. Their rental history stays in the
                              records. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(selectedCustomer.id)}
                              data-testid="button-confirm-delete-customer"
                            >
                              Delete customer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.idNumber && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{selectedCustomer.idNumber}</span>
                    </div>
                  )}
                  {selectedCustomer.notes && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Rental History</span>
                    </div>

                    {rentalsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : customerRentals && customerRentals.length > 0 ? (
                      <div className="space-y-2">
                        {customerRentals.map((rental) => {
                          const car = getCarForRental(rental);
                          return (
                            <div
                              key={rental.id}
                              className="p-3 rounded-md bg-card border border-border text-sm"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  {car && (
                                    <div
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: car.colorCode }}
                                    />
                                  )}
                                  <span className="font-medium truncate">{car?.name ?? "Unknown Car"}</span>
                                </div>
                                <span className="font-mono tabular-nums text-neon-cyan font-medium">
                                  ₱{parseFloat(rental.totalAmount).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-muted-foreground text-xs font-mono">
                                {format(new Date(rental.startDate), "MMM d, yyyy")} → {format(new Date(rental.endDate), "MMM d, yyyy")}
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 mt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total Spent</span>
                          <span className="font-mono font-bold text-neon-cyan tabular-nums">
                            ₱{getTotalSpent(selectedCustomer.id)?.toLocaleString() ?? "0"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No rental history</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-md p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select a customer to view their profile and rental history
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base uppercase tracking-widest">Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-edit-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" data-testid="input-edit-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 234 567 8900" data-testid="input-edit-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">ID / Driver's License</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DL12345678" data-testid="input-edit-customer-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="123 Main St, City" data-testid="input-edit-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes..." data-testid="input-edit-customer-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCustomerOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                  data-testid="button-update-customer"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
